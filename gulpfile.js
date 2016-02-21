var gulp = require('gulp'),
    gulpWebServer = require('gulp-webserver'),
    ts = require('gulp-typescript'),
    sourcemaps = require('gulp-sourcemaps'),
    sass = require('gulp-sass'),
    glob = require('glob'),
    fs = require('fs');

var specDir = 'spec/';
var specRoot = './spec/spec.ts';
var src = {
        specTs: ['./spec/**/*Spec.ts'],
        appTs: ['./app/*.ts', './app/**/*.ts'],
        allTs: ['./**/*.ts', '!./node_modules/**/*.ts', '!./typings/**/*.ts'],
        templates: ['./app/*.html', './app/**/*.html'],
        sass: ['./app/style/style.scss', './app/style/*.scss']
    },
    dest = {
        dest: './built',
        spec: './built/spec',
        js: './built/app',
        templates: './built/app/',
        sass: './built/app/style'
    },
    tsProject = ts.createProject('tsconfig.json');

function serve (additionalConfig) {
    additionalConfig = additionalConfig || {};

    return gulp.src('./')
        .pipe(gulpWebServer(Object.assign({
            host: '0.0.0.0',
            livereload: true,
            directoryListing: false,
            open: true,
            fallback: 'index.html'
        }, additionalConfig)));
}

function test () {
    return serve({open: '/runSpec.html'});
}

function compileTs (src, dest) {
    var tsResult = gulp.src(src)
        .pipe(sourcemaps.init())
        .pipe(ts(tsProject));

    return tsResult.js
        .on('end', function () {
            console.log('TS build finished');
        })
        .pipe(sourcemaps.write({includeContent: true}))
        .pipe(gulp.dest(dest));
}

function compileAppTs () {
    return compileTs(src.appTs, dest.js);
}

function compileSpecTs () {
    return compileTs(src.specTs, dest.spec);
}

function compileSass () {
    return gulp.src(src.sass)
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.write({includeContent: true}))
        .pipe(gulp.dest(dest.sass));
}

function copyHtml () {
    return gulp.src(src.templates)
        .pipe(gulp.dest(dest.templates));
}

function generateSpecRoot (callback) {
    function extractImportPath (file) {
        return file
            .replace(specDir, '')
            .replace(/\.ts$/, '');
    }

    function buildImport (importPath) {
        return "import \'"+importPath+"';";
    }

    glob(src.specTs[0], function (error, files) {
        if(error) {
            throw error;
        }

        var imports = files
            .map(extractImportPath)
            .map(buildImport)
            .join('\n');

        imports = '///<reference path="../typings/browser/ambient/jasmine/jasmine.d.ts" />\n'+imports;

        fs.writeFile(specRoot, imports, callback);
    });
}

function startWatchers () {
    gulp.watch(src.allTs, ['buildTs']);
    gulp.watch(src.sass, ['buildSass']);
    gulp.watch(src.templates, ['copyHtml']);
}

gulp.task('buildSass', function () {
    return compileSass();
});

gulp.task('copyHtml', function () {
    return copyHtml();
});

gulp.task('buildAppTs', function () {
    compileAppTs();
});

gulp.task('generateSpecRoot', generateSpecRoot);

gulp.task('buildSpecTs', ['generateSpecRoot'], function () {
    compileSpecTs();
});

gulp.task('buildTs', ['generateSpecRoot'], function () {
    compileTs(src.allTs, dest.dest);
});

gulp.task('build', ['buildSass', 'copyHtml', 'buildTs']);

gulp.task('serve', ['build'], function () {
    startWatchers();
    return serve();
});

gulp.task('test', ['build'], function () {
    startWatchers();
    return test();
});
