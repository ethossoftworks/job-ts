import commonjs from "@rollup/plugin-commonjs"
import resolve from "@rollup/plugin-node-resolve"
import { terser } from "rollup-plugin-terser"
import sourcemaps from "rollup-plugin-sourcemaps"
import fs from "fs"
import path from "path"

/***
 * Configuration
 */
const projectName = "Job"
const externals = {
    "@ethossoftworks/outcome": "Outcome",
}

/**
 * Build System
 */
const clean = () => ({
    name: "clean",
    buildStart: () => {
        fs.rmdirSync("./build/dist", { recursive: true })
        fs.mkdirSync("./build/dist")
    },
})

const copy = (patterns) => ({
    name: "copy",
    buildEnd: () => {
        const copy = (from, to) => {
            if (fs.statSync(from).isDirectory()) {
                fs.readdirSync(from).forEach((item) => copy(path.join(from, item), path.join(to, item)))
            } else {
                fs.mkdirSync(path.dirname(to), { recursive: true })
                fs.copyFileSync(from, to)
            }
        }

        patterns.forEach(({ from, to }) => copy(path.resolve(from), path.resolve(to)))
    },
})

const prodConfig = {
    input: "build/generated/index.js",
    output: [
        {
            file: `./build/dist/${projectName}.cjs.js`,
            format: "cjs",
            sourcemap: true,
        },
        {
            file: `./build/dist/${projectName}.esm.js`,
            format: "es",
            sourcemap: true,
        },
        {
            file: `./build/dist/${projectName}.iife.js`,
            format: "iife",
            sourcemap: true,
            name: projectName,
            globals: externals,
        },
    ],
    external: Object.keys(externals),
    plugins: [
        clean(),
        sourcemaps({ exclude: "node_modules/**" }),
        terser(),
        commonjs(),
        resolve(),
        copy([
            { from: "build/generated/types", to: "build/dist/types" },
            { from: "package.json", to: "build/dist/package.json" },
            { from: "README.md", to: "build/dist/README.md" },
            { from: "LICENSE", to: "build/dist/LICENSE" },
        ]),
    ],
    watch: {
        include: ["build/generated/*.js$"],
    },
}

const testConfig = {
    ...prodConfig,
    input: "build/generated/index.test.js",
    output: [
        {
            file: `./build/dist/${projectName}.test.js`,
            format: "cjs",
            sourcemap: true,
        },
    ],
}

export default ((env) => {
    if (env.prod) {
        process.env.NODE_ENV = "production"
        return prodConfig
    } else if (env.test) {
        return testConfig
    }
})(process.env)
