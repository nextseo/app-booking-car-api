import express from "express";
import mysql2 from "mysql2";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import session from "express-session";
import bcrypt from "bcrypt";

const app = express();
const secret = "mysecret";
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["POST", "GET"],
    credentials: true,
  })
);

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

const db = mysql2.createConnection({
  host: "82.180.152.103",
  user: "u812684713_db",
  password: "*Nextsoft1234",
  database: "u812684713_db",
});

// const db = mysql2.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "test",
// });

app.get('/', (req,res)=>{
    res.send('Hellowww')
})

app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const passwordHasg = await bcrypt.hash(password, 10);
    const userData = {
      username,
      password: passwordHasg,
      role: 1,
    };
    const [result] = await db
      .promise()
      .query("INSERT INTO login SET ?", userData);
    res.status(200).json({
      message: "success",
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "error",
      error,
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [result] = await db
      .promise()
      .query("SELECT * FROM `login` WHERE username = ?", username);
    const userData = result[0];
    // console.log(userData);
    const match = await bcrypt.compare(password, userData.password);
    if (!match) {
      res.status(400).json({
        message: "login fail username password ไม่ถูกต้อง",
      });
      return false;
    }

    // สร้าง Token
    const token = jwt.sign({ username, role: userData.role }, secret, {
      expiresIn: "1h",
    });

    res.cookie("token", token, {
      maxAge: 300000,
      secure: true,
      httpOnly: true,
      sameSite: "none",
    });
    res.status(200).json({
      message: "login success",
      token
      
    });
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "error",
      error,
    });
  }
});

// Middleware

const authenticationToken = async (req, res, next) => {
  try {
    // const authHeader = req.headers['authorization']
    // let authToken = ""
    // if(authHeader){
    //     authToken = authHeader.split(' ')[1]
    // }

    const authHeader = await req.cookies.token;
    const user = jwt.verify(authHeader, secret);

    const SELECT_USER_BY_USERNAME = "SELECT * FROM `login` WHERE username = ?";
    const [checkResults] = await db
      .promise()
      .query(SELECT_USER_BY_USERNAME, user.username);
    if (!checkResults[0]) {
      throw { message: "user not found" };
    }
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({
      message: "Unauthorized",
      error: error.message, // You can customize the error message sent to the client
    });
  }
};

// api only

app.get("/api/users", authenticationToken, async (req, res) => {
  try {
    const [result] = await db.promise().query("SELECT * from login");

    res.json({
      users: result,
    });
  } catch (error) {
    console.log(error);
    res.status(403).json({
      message: "authentication fail",
      error,
    });
  }
});

app.listen(8080, () => {
  console.log("server is 8080");
});
