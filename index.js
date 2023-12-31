import express from "express";
import mysql2 from "mysql2";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { deleteFromFTP, uploadToFTP } from "./ftp/ftpServer.js";

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://app.xn--12cbx8beub8evezb2evdwa3gkk.com",
      "https://app-booking-car-api.vercel.app",
    ],
    // methods: ["POST", "GET"],
    methods: ["POST", " GET" , "DELETE", "PUT"],

    credentials: true,
  })
);

const secret = "mysecret";
const port = process.env.PORT || 8080;
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: true,
  })
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
app.use("/images", express.static(path.join(__dirname, "images")));

const db = mysql2.createConnection({
  host: "119.59.100.54",
  user: "nextsoft_cars_kk_db",
  password: "*Nextsoft1234",
  database: "cars_kk_db",
});

// const db = mysql2.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "",
//   database: "test",
// });

function getFileExtension(filename) {
  return filename.split(".").pop();
}

app.get("/", (req, res) => {
  res.send("Hellowww v-4");
});

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
    } else {
      // สร้าง Token
      const token = jwt.sign({ username, role: userData.role }, secret, {
        expiresIn: "1d",
      });

      // res.cookie("token", token, {
      //   // maxAge: 300000,
      //   secure: true,
      //   httpOnly: true,
      //   sameSite: "none",
      // });

      res.status(200).json({
        message: "login success",
        token,
      });
    }
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
  // console.log(req.headers.authorization);
  try {
    const authHeader = req.headers.authorization;
    let authToken = "";
    if (authHeader) {
      authToken = authHeader.split(" ")[1];
    }

    // const authHeader = await req.cookies.token;
    const user = jwt.verify(authToken, secret);

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



const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post(
  "/api/cars",
  authenticationToken,
  upload.single("file"),
  async (req, res) => {
    try {
      const { code, name, license, other } = req.body;
      const file = req.file;
      const image = req.file.originalname;

      if (!file) {
        return res.status(400).send("No file uploaded.");
      }

      

      const sql =
        "INSERT INTO cars (code, name, license, other, image ) VALUES (?,?,?,?,?)";
      const [result] = await db
        .promise()
        .query(sql, [
          code || "",
          name || "",
          license || "",
          other || "",
          image || "",
        ]);
      console.log(result);

      await uploadToFTP(file);
      res.status(200).json({
        message: "บันทึกสำเร็จ",
      });
    } catch (error) {
      console.log(error);
      res.status(400).json({
        message: "บันทึกข้อมูลไม่สำเร็จ !",
      });
    }
  }
);



app.get("/api/cars", authenticationToken, async (req, res) => {
  try {
    const sql = "SELECT * FROM cars";
    const [result] = await db.promise().query(sql);
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    res.status(400).json({
      message: "บันทึกข้อมูลไม่สำเร็จ !",
    });
  }
});



app.delete("/api/car/:id/:image", authenticationToken , async (req,res)=> {
 try {
  const id = req.params.id
  const image = req.params.image


  const sql = "DELETE FROM cars WHERE id = ?"
  const result = await db.promise().query(sql, [id])
  console.log(result);
  await deleteFromFTP(image);
  res.status(200).json({
    message: 'delete success'
  })
 } catch (error) {
  console.log(error);
 }

})

app.put('/api/car', authenticationToken,  async (req,res)=>{
try {
  const { code, name, license, other, id } = req.body;
  if(!name || !code) {
    return res.status(400).json({message : "update faile no data"})
  }
  const sql = "UPDATE  cars SET code = ?, name = ?, license = ?, other = ? WHERE id = ? "
  const values = [code, name, license, other, id]
  const result = await db.promise().query(sql, values)
  res.status(200).json({message: 'update success', result})
} catch (error) {
  console.log(error);
  res.status(400).json({message: 'Update Error'})
}



})

app.listen(port, () => {
  console.log("server is 8080");
});
