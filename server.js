const  express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const mongodb = require('mongodb');
const  dbConfig = require('./config/dbconfig.js');





const app = express();



app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

const MongoClient = mongodb.MongoClient;

let db;


MongoClient.connect(dbConfig.url,{ useNewUrlParser: true, useUnifiedTopology: true}, function(err,database){
    if(err){
      return console.error(err);
     }

    db = database.db('dbprojectA');
   console.log("Connected to database.");

   /*



    db.createCollection("users", function(err,res){
    if(err)
	{
	 throw err;
        }
     console.log("Collection Created");
    
   });*/
});


//session
app.use(session({
    key: 'user_id',
    secret: 'TheRandomSecretKey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        expires: 600000
    }
}));


//encryption utility
let passUtil = {
	hashed(password){
	 const salt = bcrypt.genSaltSync();
	 return bcrypt.hashSync(password, salt);	
	},
       validate(password, hashedPass){
         return bcrypt.compareSync(password,hashedPass);
	}
}



app.use(function(req,res,next){
   if(req.cookies.user_id && !req.session.user){
     res.clearCookie('user_id');
   }
    next();
});


// 

let isSessionExist = function(req,res,next){
	if(req.session.user && req.cookies.user_id){
           res.render('landingPage', {name: req.session.user.name})
	} 
       else{
         next();
       }
};


//require('./app/routes/routes')(app);

app.set("views",path.join(__dirname,"views"));
app.set("view engine","pug");



//routes

app.get("/",function(req,res){
  res.render("index", { title: "Home" });
});



app.get('/landingPage',function(req,res){
    if(req.session.user && req.cookies.user_id){
     res.render("landingPage", {name: req.session.user.name});	
   }
   else{
    res.render("login");
  }
});


app.route('/signup')
	.get(isSessionExist,function(req,res){
	 res.render("signup", {title: "SignUp"}); 
	})
	.post(function(req,res){
	
	let data = req.body; 
	db.collection('users').insertOne({
		username: data.username,
		password: passUtil.hashed(data.password),
		name: data.name,
		mobile_number: data.mobileNumber
	}).then(function(result){
          req.session.user = result.ops[0];
          res.render('landingPage',{name: result.ops[0].name});
	}).catch(
		function(err){
		 res.render("signup");
	})
      });







app.route('/login') 
        .get(isSessionExist,function(req,res){
          res.render("login", {title: "Login"});
        })
        .post(function(req,res){
         let {username, password } = req.body;
		db.collection('users').findOne({username: username })
		.then(function(user){
                    if(!user){
			 res.render('login');
			}
		    else if(!passUtil.validate(password, user.password)){
                        res.render('login');
		   }
		  else{
	            req.session.user = user;
		   res.render('landingPage', {name: user.name});
		}
                });
        });

app.get('/logout',function(req,res){
    if(req.session.user && req.cookies.user_id){
      res.clearCookie('user_id');
      res.render("index", { title: "Home" });
     }
   else{
     res.render('login');
   }
});

//routes
app.use(function(req,res,next){
 //res.render("Nothing Here Go Home");
 res.status(400).send("404 Not Found")
});


app.listen(3000,function() {
    console.log("Server is listening on port 3000");
});
