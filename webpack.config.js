/**
 * Notes:
 *
 * ts-loader was not used because it did not correctly recompile changed files. Instead we use `tsc -b` as a separate
 * build step that gets mapped to the build/generated folder which webpack then bundles.
 */

const projectName = "Job"

const webpack = require("webpack")
const path = require("path")
const fs = require("fs")
const CopyWebpackPlugin = require("copy-webpack-plugin")

const prodConfig = {
    mode: "production",
    target: "web",
    entry: "./build/generated/index.js",
    resolve: {
        extensions: [".tsx", ".ts", ".js", ".jsx"],
        alias: {
            lib: path.resolve(__dirname, "build/generated/lib"),
            model: path.resolve(__dirname, "build/generated/model"),
            service: path.resolve(__dirname, "build/generated/service"),
            state: path.resolve(__dirname, "build/generated/state"),
            ui: path.resolve(__dirname, "build/generated/ui"),
        },
    },
    output: {
        filename: `${projectName}.js`,
        path: path.resolve(__dirname, "build/dist"),
        library: projectName,
        libraryTarget: "umd",
        globalObject: "this",
    },
    externals: {
        "@ethossoftworks/outcome": {
            amd: "@ethossoftworks/outcome",
            commonjs: "@ethossoftworks/outcome",
            commonjs2: "@ethossoftworks/outcome",
            root: "Outcome",
        },
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                enforce: "pre",
                use: {
                    loader: "source-map-loader",
                    options: {
                        filterSourceMappingUrl: (url, resourcePath) => !/node_modules/.test(resourcePath),
                    },
                },
            },
        ],
    },
    plugins: [
        {
            apply: (compiler) => {
                // Clean `./build/dist` folder
                compiler.hooks.beforeRun.tap(`${projectName}-PreEmit`, (compilation) => {
                    fs.rmdirSync("./build/dist", { recursive: true })
                    fs.mkdirSync("./build/dist")
                })
            },
        },
        new webpack.WatchIgnorePlugin({
            paths: [path.resolve(__dirname, "src"), path.resolve(__dirname, "node_modules")],
        }),
        new CopyWebpackPlugin({
            patterns: [
                { from: path.resolve(__dirname, "build/generated/types"), to: "./types" },
                { from: path.resolve(__dirname, "package.json"), to: "./" },
                { from: path.resolve(__dirname, "README.md"), to: "./" },
                { from: path.resolve(__dirname, "LICENSE"), to: "./" },
            ],
        }),
    ],
    devtool: "source-map",
    devServer: {
        contentBase: path.resolve(__dirname, "build/dist"),
        compress: true,
        port: 80,
        historyApiFallback: {
            index: "index.html",
        },
    },
}

const devConfig = {
    ...prodConfig,
    mode: "development",
}

const testConfig = {
    ...prodConfig,
    ...{
        entry: `./build/generated/index.test.js`,
        mode: "development",
        target: "node",
        output: {
            filename: `${projectName}.test.js`,
            path: path.resolve(__dirname, "build/dist"),
        },
        externals: {},
        optimization: {},
    },
}

module.exports = (env) => {
    if (env.prod) {
        return prodConfig
    } else if (env.dev) {
        return devConfig
    } else if (env.test) {
        return testConfig
    }
}
