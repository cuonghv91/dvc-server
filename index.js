const express = require("express");
var cors = require("cors");
var fs = require("fs");
var NodeGit = require("nodegit");
var path = require("path");
var exec = require("child_process").exec;
const multer = require("multer");
const util = require("util");
var mv = require("mv");
const fsx = require("fs-extra");
const Filehound = require("filehound");

const { spawn } = require("child_process");

const PORT = 3001;
const app = express();
const basePath = "./";
let APP_DATA_DIR = "";
var currentFolder = "";
var datasetName = "";
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.get("/", function (req, res) {
  return res.send({ error: true, message: "hello" });
});

function runInit(pathname, cmd) {
  var options = { cwd: `${pathname}` };
  const exec = require("child_process").exec;
  return new Promise((resolve, reject) => {
    exec(cmd, options, (error, stdout, stderr) => {
      if (error) {
        console.warn(error);
        reject(error);
      }
      console.log(stdout);
      resolve(stdout ? stdout : stderr);
    });
  });
}

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, __dirname + "/upload");
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  },
});

var upload = multer({ storage: storage }).array("file", 100000);

app.get("/dataset", function (req, res, next) {
  let result = [];
  let files = fs.readdirSync(`./${APP_DATA_DIR}`);
  files = files.filter((item) => item.indexOf(".") === -1);

  files.forEach((item) => {
    let inner = fs.readdirSync(`./${APP_DATA_DIR}/${item}`);
    result.push({
      datasetName: item,
      list: inner,
    });
  });

  console.log(111, result);

  res.status(200).json({ list: result, repo: reponame });
});

app.post("/dataset-upload", upload, function (req, res, next) {
  mv("./upload", currentFolder, { clobber: false }, async function (err) {
    if (!fs.existsSync(`${basePath}/upload`)) {
      fs.mkdirSync(`${basePath}/upload`);
    }

    await runInit(`./${APP_DATA_DIR}`, `dvc add ${datasetName}`);
    await runInit(`./${APP_DATA_DIR}`, `git add .`);
    await runInit(`./${APP_DATA_DIR}`, `git commit -m "Add ${datasetName}"`);
    await runInit(`./${APP_DATA_DIR}`, `git push origin master`);
    await runInit(`./${APP_DATA_DIR}`, `dvc push`);

    res.status(200).json({ msg: "success" });
  });
});

app.post("/name-data-set", async function (req, res) {
  currentFolder = `${basePath}${req.body.repoName}/${req.body.nameDataset}`;
  datasetName = req.body.nameDataset;
  try {
    if (
      !fs.existsSync(`${basePath}${req.body.repoName}/${req.body.nameDataset}`)
    ) {
      await fs.promises.mkdir(
        `${basePath}${req.body.repoName}/${req.body.nameDataset}`
      );
    }

    res.status(200).json({ msg: "success" });
  } catch (err) {
    res.status(400).json({ msg: "failed" });
  }
});

app.post("/git-repo", async function (req, res) {
  reponame = req.body.name;
  APP_DATA_DIR = req.body.name.split(".git").join("").split("/")[
    req.body.name.split(".git").join("").split("/").length - 1
  ];
  try {
    await runInit(basePath, `git clone ${req.body.name}`);
    await runInit(`./${APP_DATA_DIR}`, `dvc init`);
    await runInit(`./${APP_DATA_DIR}`, `git commit -m "Initialize DVC"`);

    await runInit(
      `./${APP_DATA_DIR}`,
      `dvc remote add -d storage ../storage-service`
    );
    await runInit(`./${APP_DATA_DIR}`, `git add .dvc/config`);
    await runInit(
      `./${APP_DATA_DIR}`,
      `git commit -m "Configure remote storage"`
    );

    res.status(200).json({ msg: "success" });
  } catch (err) {
    res.status(400).json({ msg: "failed" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
