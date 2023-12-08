const express = require("express");
const serverListener = express();
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const con = mysql.createConnection({
  host: "localhost",
  user: "user1",
  password: "root",
  database: "hospital",
});

const cookieParams = {
  maxAge: 1000 * 60 * 15,
  httpOnly: true,
  signed: true,
};

con.connect();

//setting view engine to ejs
serverListener.set("view engine", "ejs");
serverListener.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

serverListener.use(cookieParser("MY SECRET"));

serverListener.use(bodyParser.json());

//route for index page
serverListener.get("/", function (req, res) {
  res.render("index");
});

serverListener.post("/UpdateCheckUp/", function (req, res) {
  let { pulse, oxy_lvl, temprature, chid } = req.body;
  let sql = `update patientcheckups set pulse=?, oxygen_level=? , temprature=? where id=?`;
  con.query(
    sql,
    [pulse, oxy_lvl, temprature, chid],
    function (err, results, fs) {
      if (err) {
        res.render("error", { errorMsg: err });
        return;
      } else {
        if (req.signedCookies.type == "doctor") {
          res.redirect("/doctors");
        } else {
          res.redirect("/nurses");
        }
      }
    }
  );
});

serverListener.post("/ChangePassword", function (req, res) {
  let sql = `select password,id from userlogin where id = ?`;
  con.query(
    sql,
    [req.signedCookies.token2],
    function (errObject, results, fields) {
      if (results[0].password == req.body.oldPassword)
        sql = `update userlogin set password = ? where id = ?`;
      con.query(
        sql,
        [req.body.newPassword, results[0].id],
        function (err, result, fs) {
          if (result.affectedRows > 0) {
            switch (req.signedCookies.type) {
              case "doctor": {
                res.redirect("/doctors");
                break;
              }
              case "nurse": {
                res.redirect("/nurses");
                break;
              }
              case "admin": {
                res.redirect("/admin");
                break;
              }
              case "patient": {
                res.redirect("/patients");
                break;
              }
            }
          }
        }
      );
    }
  );
});

serverListener.post("/AddDoctorAccount", function (req, res) {
  if (req.headers.cookie === undefined) {
    res.render("error", { errorMsg: "User-Authentication ," });
    if (req.signedCookies.token2 != "admin") {
      res.render("error", { errorMsg: "Insufficent privilages ," });
    }
  }

  let doctors_insert_sql = `insert into doctors (id,name,email,phone_num,timings_from,timings_to,create_time,userType) values (?,?,?,?,?,?,?,?)`;
  let now = new Date(),
    year = now.getFullYear(),
    month = parseInt(now.getMonth()) + 1,
    day = parseInt(now.getDay()) + 1;
  let _date = `${year}-${month}-${day}`;
  let uid = uuidv4();
  let values = [
    uid,
    req.body.name,
    req.body.email,
    req.body.phone_num,
    req.body.timings_from,
    req.body.timings_to,
    _date,
    1,
  ];
  con.query(doctors_insert_sql, values, function (err, doc_res, fs) {
    if (err) res.render("error", { errorMsg: err });
    else {
      let insert_userlogin_sql = `insert into userlogin (id,email,password,userTypeId,create_time,token) values (?,?,?,?,?,?)`;
      values = [
        uid,
        req.body.email,
        Password(req.body.email, "encrypt"),
        1,
        _date,
        Math.random() + "_" + Math.random(),
      ];
      con.query(
        insert_userlogin_sql,
        values,
        function (err, userLoginresults, fs) {
          if (err) {
            res.render("error", { errorMsg: err });
          } else {
            res.redirect(
              "/admin?affectedRows=" +
                userLoginresults.affectedRows +
                "&patientAdded=true"
            );
          }
        }
      );
    }
  });
});

serverListener.post("/AddPatients", function (req, res) {
  let sql = `insert into patients (id,name,phone,email,address,usertype,create_time) VALUES (?,?,?,?,?,?,?)`;
  let now = new Date(),
    year = now.getFullYear(),
    month = parseInt(now.getMonth()) + 1,
    day = parseInt(now.getDay()) + 1;
  let _date = `${year}-${month}-${day}`;
  let uid = uuidv4();
  let values = [
    uid,
    req.body.pname,
    req.body.pnum,
    req.body.pemail,
    req.body.pAddress,
    req.body.usertype,
    _date,
  ];
  con.query(sql, values, function (error, results, fields) {
    if (error) {
      res.render("error", { errorMsg: error });
    } else {
      sql = `insert into userlogin (id,email,password,userTypeId,create_time,token) values (?,?,?,?,?,?)`;
      values = [
        uid,
        req.body.pemail,
        req.body.pemail,
        3,
        _date,
        Math.random() + "_" + Math.random(),
      ];
      con.query(sql, values, function (err, userLoginresults, fs) {
        if (err) {
          res.render("error", { errorMsg: err });
        } else {
          res.redirect(
            "/doctors?affectedRows=" +
              userLoginresults.affectedRows +
              "&patientAdded=true"
          );
        }
      });
    }
  });
});

serverListener.post("/AddPatientCheckUps", function (req, res) {
  let sql = `insert into patientcheckUps (id,scheduledTime,doctor_id,create_time,reason,patient_id) VALUES (?,?,?,?,?,?)`;
  let now = new Date(),
    year = now.getFullYear(),
    month = parseInt(now.getMonth()) + 1,
    day = parseInt(now.getDay()) + 1;
  let _date = `${year}-${month}-${day}`;
  let values = [
    uuidv4(),
    req.body.scheduledTime,
    req.signedCookies.token2,
    _date,
    req.body.reason,
    req.body.patient_Id,
  ];
  if (req.body.callFrom == "PatientsPage") {
    values = [
      uuidv4(),
      req.body.scheduledTime,
      req.body.doctor_Id,
      _date,
      req.body.reason,
      req.signedCookies.token2,
    ];
  }
  con.query(sql, values, function (error, results, fields) {
    if (error) {
      res.render("error", { errorMsg: error });
    } else {
      if (req.body.callFrom == "PatientsPage") {
        res.redirect(
          "/patients?affectedRows=" +
            results.affectedRows +
            "&CheckUpAdded=true"
        );
      } else {
        res.redirect(
          "/doctors?affectedRows=" + results.affectedRows + "&CheckUpAdded=true"
        );
      }
    }
  });
});

serverListener.get("/logout", function (req, res) {
  res.clearCookie("type");
  res.clearCookie("token");
  res.header("Cache-Control", "private, no-cache, no-store, must-revalidate");
  res.redirect("/");
});

serverListener.post("/DoctorAccountStatusChange", function (req, res) {
  let { doc_id, status } = req.body;
  let sql = `update userlogin set status=? where id=?`;
  con.query(sql,[status,doc_id], function (err, results, fs) {
    if (err) res.render("error", { errorMsg: err });
    if (results.affectedRows > 0) res.redirect("/admin");
  });
});

//route for magic page
serverListener.get("/patients", function (req, res) {
  if (req.headers.cookie === undefined) {
    res.render("error", { errorMsg: "User-Authentication ," });
  } else {
    con.query(
      "select scheduledTime,reason,d.name as doctor_name from patientcheckups as pc,patients as p,doctors as d where pc.doctor_id=d.id  and pc.patient_id=p.id  and p.id = ?",
      [req.signedCookies.token2],
      function (err, cs, fs) {
        con.query(
          `select DISTINCT d.name as name,d.id as doc_id from doctors as d,userlogin as ul where d.userType=ul.userTypeId`,
          function (err, docs_list, fs) {
            res.render("patients", {
              checkUplist: cs,
              doc_list: docs_list,
            });
          }
        );
      }
    );
  }
});

serverListener.post("/login", function (req, res) {
  let userName = req.body.username,
    passWord = req.body.password;
  let sql = `select ul.id as myId,ut.type as myType,status from userlogin as ul,usertype as ut where ul.userTypeId=ut.id and ul.email=?  and ul.password=?`;

  con.query(sql, [userName, passWord], function (error, results, fields) {
    if (error) res.render("error", { errorMsg: error });
    if (results.length === 0) {
      res.render("error", { errorMsg: "User-Authentication Error," });
    } else if (results[0].status == 0) {
      res.render("error", {
        errorMsg:
          "Account Access Disabled .Please request Administrator to unlock your account",
      });
    } else {
      switch (results[0].myType) {
        case "doctor": {
          res
            .cookie("token", Math.random().toString(), cookieParams)
            .cookie("type", results[0].myType, cookieParams)
            .cookie("token2", results[0].myId, cookieParams);
          res.header(
            "Cache-Control",
            "private, no-cache, no-store, must-revalidate"
          );
          res.redirect("/doctors");
          break;
        }
        case "nurse": {
          res
            .cookie("token", Math.random().toString(), cookieParams)
            .cookie("type", results[0].myType, cookieParams)
            .cookie("token2", results[0].myId, cookieParams);
          res.header(
            "Cache-Control",
            "private, no-cache, no-store, must-revalidate"
          );
          res.redirect("/nurses");
          break;
        }
        case "patient": {
          res
            .cookie("token", Math.random().toString(), cookieParams)
            .cookie("type", results[0].myType, cookieParams)
            .cookie("token2", results[0].myId, cookieParams);
          res.header(
            "Cache-Control",
            "private, no-cache, no-store, must-revalidate"
          );
          res.redirect("/patients");
          break;
        }
        case "admin": {
          res
            .cookie("token", Math.random().toString(), cookieParams)
            .cookie("type", results[0].myType, cookieParams)
            .cookie("token2", results[0].myId, cookieParams);
          res.header(
            "Cache-Control",
            "private, no-cache, no-store, must-revalidate"
          );
          res.redirect("/admin");
          break;
        }
      }
    }
  });
});

serverListener.get("/admin", async function (req, res) {
  if (req.headers.cookie === undefined) {
    res.render("error", { errorMsg: "User-Authentication ," });
  } else {
    con.query(
      "select name,phone,email,address,type from patients as p,usertype as u where u.id=p.usertype",
      function (err, p_results, fs) {
        con.query(
          `select name,d.email as email,phone_num,type,d.id as doc_id,status from doctors as d,usertype as u,userlogin as ul
          where d.userType=u.id and ul.id=d.id`,
          function (d_err, d_results, pfs) {
            con.query(
              `select name,phone_num,type,d.id as nurse_id,status from nurses as d,usertype as u,userlogin as ul
              where d.userType=u.id and ul.id=d.id`,
              function (n_err, n_res, nfs) {
                res.render("admin", {
                  doctorsList: d_results,
                  patientList: p_results,
                  nurseList: n_res,
                });
              }
            );
          }
        );
      }
    );
  }
});

serverListener.post("/DeleteDoctorAccount", function (req, res) {
  if (req.headers.cookie === undefined) {
    res.render("error", { errorMsg: "User-Authentication ," });
    if (req.signedCookies.token2 != "admin") {
      res.render("error", { errorMsg: "Insufficent privilages ," });
    }
  }
  var sql = `DELETE FROM doctors WHERE id = ? `;
  con.query(sql, [req.body.doc_id], function (err, result) {
    if (err) res.render("error", { errorMsg: err });
    else {
      let sql1 = "DELETE FROM userlogin WHERE id = ? ";
      con.query(
        sql1,
        [req.body.doc_id],
        function (errobObject, userLoginRes, fs1) {
          if (errobObject) {
            if (errobObject) res.render("error", { errorMsg: errobObject });
          } else {
            res.redirect("/admin");
          }
        }
      );
    }
  });
});

serverListener.get("/doctors", function (req, res) {
  if (req.headers.cookie === undefined) {
    res.render("error", { errorMsg: "User-Authentication ," });
  } else {
    let sql = "select * from patients";
    con.query(sql, function (error, results, fields) {
      var patientsLists = results;
      //
      con.query(
        "select patientcheckups.id as chid,name,scheduledTime,reason,pulse,oxygen_level,temprature from patientcheckups,patients where patientcheckups.doctor_id = ? and patientcheckups.patient_id=patients.id",
        [req.signedCookies.token2],
        function (err, checkupResults, fs) {
          res.render("doctors", {
            patientList: patientsLists,
            checkUplist: checkupResults,
            affectedRows: req.params.affectedRows ? req.params.affectedRows : 0,
          });
        }
      );
    });
  }
});

serverListener.listen(8080, function () {
  console.log("Server is running on port 8080 ");
});
