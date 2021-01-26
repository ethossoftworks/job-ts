const fs = require("fs")
const path = require("path")
const childProcess = require("child_process")

// This script might fail if it's in a folder being synced by DropBox
const libName = "@ethossoftworks/job"
const rootDir = path.dirname(__dirname, "../")

var existingTarballs = fs.readdirSync(rootDir).filter((file) => file.endsWith(".tgz"))
existingTarballs.forEach((file) => {
    fs.unlinkSync(path.resolve(rootDir, file))
})

process.chdir(path.resolve(rootDir, "../"))
childProcess.execSync("yarn build-pack", { stdio: "inherit" })
process.chdir(rootDir)

try {
    childProcess.execSync(`yarn remove ${libName}`, { stdio: "inherit" })
} catch (e) {}

childProcess.execSync("yarn cache clean", { stdio: "inherit" })

var newTarballs = fs.readdirSync(path.resolve(rootDir, "../build/dist")).filter((file) => file.endsWith(".tgz"))
newTarballs.forEach((file) => {
    fs.copyFileSync(path.resolve(rootDir, `../build/dist/${file}`), path.resolve(rootDir, `./${file}`))
    childProcess.execSync(`yarn add ./${file}`, { stdio: "inherit" })
})

childProcess.execSync(`yarn build`, { stdio: "inherit" })
