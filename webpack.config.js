const path = require('path');
const webpack = require('webpack');
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
// const CircularDependencyPlugin = require('circular-dependency-plugin');

const sharedConfig = {
    module: {
        rules: [
            {
                loader: 'raw-loader',
                test: /\.(glsl|frag|vert)$/,
                include: [path.resolve(__dirname, 'build/src/')],
            },
            {
                loader: 'glslify-loader',
                test: /\.(glsl|frag|vert)$/,
                include: [path.resolve(__dirname, 'build/src/')]
            },

            {
                loader: 'file-loader',
                test: /\.(woff2?|ttf|otf|eot|svg|html)$/,
                include: [path.resolve(__dirname, 'build/src/')],
                options: {
                    name: '[name].[ext]'
                }
            },
            {
                test: /\.(s*)css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader', 'resolve-url-loader', 'sass-loader']
            }
        ]
    },
    plugins: [
        // new CircularDependencyPlugin({
        //     include: [ path.resolve(__dirname, 'build/src/') ],
        //     failOnError: false,
        //     cwd: process.cwd(),
        // }),
        new ExtraWatchWebpackPlugin({
            files: [
                './build/src/**/*.vert',
                './build/src/**/*.frag',
                './build/src/**/*.glsl',
                './build/src/**/*.scss',
                './build/src/**/*.html'
            ],
        }),
        new webpack.DefinePlugin({
            __PLUGIN_VERSION_TIMESTAMP__: webpack.DefinePlugin.runtimeValue(() => `${new Date().valueOf()}`, true),
        }),
        new MiniCssExtractPlugin({ filename: 'app.css' })
    ],
    resolve: {
        modules: [
            'node_modules',
            path.resolve(__dirname, 'build/src/')
        ],
    }
}

function createEntryPoint(name, dir, out) {
    return {
        entry: path.resolve(__dirname, `build/src/${dir}/${name}.js`),
        output: { filename: `${name}.js`, path: path.resolve(__dirname, `build/${out}`) },
        ...sharedConfig
    }
}

function createNodeEntryPoint(name, dir, out) {
    return {
        target: 'node',
        entry: path.resolve(__dirname, `build/src/${dir}/${name}.js`),
        output: { filename: `${name}.js`, path: path.resolve(__dirname, `build/${out}`) },
        ...sharedConfig
    }
}

function createApp(name) { return createEntryPoint('index', `apps/${name}`, name) }
function createBrowserTest(name) { return createEntryPoint(name, 'tests/browser', 'tests') }
function createNodeApp(name) { return createNodeEntryPoint('index', `apps/${name}`, name) }

module.exports = [
    createApp('viewer'),
    createApp('basic-wrapper'),
    createNodeApp('state-docs'),
    createApp('model-server-query'),

    createBrowserTest('font-atlas'),
    createBrowserTest('render-mesh'),
    createBrowserTest('render-shape'),
    createBrowserTest('render-spheres'),
    createBrowserTest('render-structure'),
    createBrowserTest('render-text'),
]