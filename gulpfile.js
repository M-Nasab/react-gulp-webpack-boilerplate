const { src, dest, watch, series, parallel } = require('gulp');
const del = require('del');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const imagemin = require('gulp-imagemin');
const cache = require('gulp-cache');
const webpackStream = require('webpack-stream');
const webpack = require('webpack');
const webpackProductionConfig = require('./webpack.config');
const webpackDevConfig = require('./webpack.dev.config');
const argv = require('yargs').argv;

const PATHS = {
    'CSS': 'dist/css',
    'JS': 'dist/js',
    'Images': 'dist/images',
    'Fonts': 'dist/fonts'
}

var isProduction = (argv.production === undefined) ? false : true;

var browserSync = require('browser-sync').create();

sass.compiler = require('node-sass');

function clean(){
    return del(['dist/**', 'src/temp/**']);
}

function sassTask(){
    return src('src/scss/**.scss', { sourcemaps: !isProduction })
        .pipe(sass().on('error', sass.logError))
        .pipe(dest('src/temp/css'));
}

function styles(){
    let plugins = [
        autoprefixer({
            browsers: ['last 2 version']
        }),
        cssnano()
    ];

    return sassTask()
        .pipe(postcss(plugins))
        .pipe(dest(PATHS.CSS), { sourcemaps: isProduction ? false : '.' });
}

function webpackTask(){
    let webpackConfig = isProduction ? webpackProductionConfig : webpackDevConfig;

    return src("./src/js/index.js")
        .pipe(webpackStream(webpackConfig, webpack))
        .pipe(dest(PATHS.JS));
}

function scripts(){
    return webpackTask();
}

function images(){
    return src('src/images/**/*.+(png|jpg|jpeg|gif|svg)')
        .pipe(cache(imagemin({
            interlaced: true
        })))
        .pipe(dest(PATHS.Images));
}

function fonts(){
    return src('src/fonts/**/*')
        .pipe(dest(PATHS.Fonts));
}

function HTML(){
    return src('src/*.html')
        .pipe(dest('dist'));
}

function watchStyles(){
    return styles().pipe(browserSync.stream());
}

function watchScripts(){
    let stream = scripts();
    browserSync.reload();
    return stream;
}

function watchHTML(){
    let stream = HTML();
    browserSync.reload();
    return stream;
}

function watchTask(cb){
    
    browserSync.init({
        server: {
            baseDir: 'dist'
        },
    });

    watch('src/scss/**/*.scss', watchStyles);
    watch('src/js/**/*.js', watchScripts);
    watch('src/**/*.html', watchHTML);
    
    cb();
}

var build = series(clean, parallel(styles, scripts, images, fonts, HTML));
var dev = series(build, watchTask);

exports.dev = dev;
exports.build = build;
exports.default = build;