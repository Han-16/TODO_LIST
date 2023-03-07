const express = require('express');
const app = express();
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended : true}));
app.set('view engine', 'ejs');
app.use('/public', express.static('public'));
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
require('dotenv').config();


var db;

MongoClient.connect(process.env.DB_URL, function(err, client){
    if (err) return console.log(err);

    db = client.db('scv_todo');
    
    app.listen(8080, function(){
        console.log("listening on 8080")
    })  

    app.get('/', (req, res) => {
        res.sendFile(__dirname + "/index.html")
    });

    app.get('/write', (req, res) => {
        res.render('write.ejs');
    });

    app.post('/add', (req, res) => {
        
        db.collection('counter').findOne({name : "게시물 갯수"}, (err, result) => {
            console.log("number of post : ", result.totalPost + 1)
            var total_post = result.totalPost;
            db.collection('post').insertOne( { _id : total_post + 1, task : req.body.task, date : req.body.date, content : req.body.content}, function(err, result){
                console.log("Write Done!");
                db.collection('counter').updateOne({name : '게시물 갯수'}, { $inc : {totalPost : 1} }, (err, result) => {
                    if (err) return console.log(err);
                    res.redirect('/list');
                })
            });
        
        });
    });



    app.get('/list', (req, res) => {
        // db에 저장된 post라는 collection 안에 있는 모든 데이터 꺼내기
        db.collection('post').find().toArray((err, result) => {
            console.log("---------------------------------------------------------------")
            console.log(result);
            console.log("---------------------------------------------------------------")
            res.render('list.ejs', {posts : result});  
        });
    });

    app.delete('/delete', (req, res) => {
        console.log(req.body);
        req.body._id = parseInt(req.body._id);
        // req.body에 담겨온 게시물 번호를 가진 글을 db에서 찾아서 삭제
        db.collection('post').deleteOne(req.body, (err, result) => {
            if (err) return console.log(err);
            console.log("삭제 완료");
            res.status(200).send({ message : "성공했습니다~" });
        });
    });
     

    app.delete('/delete_detail', (req, res) => {
        console.log("글 번호 : ", req.body._id);
        req.body._id = parseInt(req.body._id);
        db.collection('post').deleteOne(req.body, (err, result) => {
            if (err) return console.log(err);
            console.log("삭제완료!");
            res.status(200).send();
        });
        
    })

    

    app.get('/detail/:id', function(req, res) {
        db.collection('post').findOne({ _id : parseInt(req.params.id) }, function(err, result) {
            
            console.log(result);
            if (result) {
                res.render('detail.ejs', { data : result })
            } else {
                console.log("없는 데이터 요청");
                // res.render('nothing.html');

            }
        });
    });

    app.get('/edit/:id', (req, res) => {
        
        db.collection('post').findOne({ _id : parseInt(req.params.id)}, function(err, result) {

            console.log("edit 페이지 접속");
            console.log(result);
            if (result) {
                res.render('edit.ejs', { data : result })
            } else {
                console.log("없는 데이터 요청");
            }

        });
        
    });

    app.put('/edit', function(req, res) {
    //     // 수정요청이 온 데이터를 받음. db에서 해당하는 글번호와 같은 데이터를 수정요청이 온 데이터로 변경함.
        db.collection('post').updateOne({ _id : parseInt(req.body.id) }, 
        { $set : { task : req.body.task, date : req.body.date, content : req.body.content } }, 
        function(err, result){
            console.log("수정 완료");
            // alert("수정완료!")
            res.redirect('/list');
        });
    });

});



const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session()); 


app.get('/signin', (req, res) => {
    res.render('signin.ejs');
});

app.post('/signin', passport.authenticate('local', {
    failureRedirect : '/fail'
}), (req, res) => {
    res.redirect('/');
});


app.get('/mypage', RUlogin, (req, res) => {
    console.log(req.user);
    res.render('mypage.ejs', {user : req.user});

});

function RUlogin(req, res, next) {
    if (req.user) {
        console.log("req.user : " + req.user);
        next();
    } else {
        res.send("로그인 안하셨는데요?")
    }
}


passport.use(new LocalStrategy({
    usernameField : 'id',
    passwordField : 'pw',
    session : true,
    passReqToCallback : false,
}, (input_id, input_pw, done) => {
    console.log(input_id, input_pw);
    db.collection('login').findOne({ id : input_id }, (err, result) => {
        if (err) return done(err);
                            // done(서버에러, 성공 시 사용자 DB 데이터, 에러메세지 넣는 곳)
        if (!result) return done(null, false, {message : "존재하지 않는 아이디입니다."})
        if (input_pw == result.pw){
            return done(null, result)
        } else {
            return done(null, false, {message : "비번 틀린 듯?"})
        }
    })
}));


passport.serializeUser((user, done) => {
    done(null, user.id); 
});

passport.deserializeUser((id, done) => {
    db.collection('login').findOne({ id : id }, (err, result) => {
        done(null, result);
    });
    
})
  
app.get('/signup', (req, res) => {
    res.render('signup.ejs');
});


app.post('/signup', (req, res) => {
    console.log(req.body);
    db.collection('login').findOne({ id : req.body.id }, (err, result) => {
        if (err) return console.log(err);
        if (result) {
            console.log("이미 있는 ID입니다.");
            // console.log(result);
            // alert("이미 있는 ID입니다!");
            res.render("signup.ejs");
        } else{
             
        }
    });
});


app.get('/search', (req, res) => {
    console.log(req.query.value);
    db.collection('post').find({ task : req.query.value }).toArray((err, result) => {
        if (err) return console.log(err);
        if (result) {
            res.render("search.ejs", { posts : result, search_word : req.query.value });
            console.log(result);
        } else {
            console.log("없는 데이터 요청");
        }
    });
}); 


