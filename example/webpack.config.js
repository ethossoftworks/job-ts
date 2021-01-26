/**
 * Notes:
 *
 * ts-loader was not used because it did not correctly recompile changed files. Instead we use `tsc -b` as a separate
 * build step that gets mapped to the build/generated folder which webpack then bundles.
 */

const projectName = "app"

const webpack = require("webpack")
const path = require("path")
const fs = require("fs")
const CopyWebpackPlugin = require("copy-webpack-plugin")

const prodConfig = {
    mode: "production",
    target: "web",
    entry: {
        core: { import: "./build/generated/index.js", dependOn: "libs" },
        libs: [
            "react",
            "react-dom",
            "react-transition-group",
            "lodash.isequal",
            "rxjs",
            "rxjs/operators",
            "@ethossoftworks/outcome",
        ],
    },
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
        filename: `${projectName}.[name].js`,
        path: path.resolve(__dirname, "build/dist"),
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
            patterns: [{ from: "./static", to: "./" }],
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
        entry: `./src/index.test.ts`,
        mode: "development",
        target: "node",
        output: {
            filename: `${projectName}.test.js`,
            path: path.resolve(__dirname, "build/dist"),
        },
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
