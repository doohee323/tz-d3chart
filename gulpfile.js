var gulp = require('gulp');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var webserver = require('gulp-webserver');
var open = require('gulp-open');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gutil = require('gulp-util');
var babelify = require('babelify');

var watch = require('gulp-watch');
var dirSync = require('gulp-directory-sync');

var dependencies = [ 'react', 'react-dom' ];
var scriptsCount = 0;

var appDir = 'app';

var jsxcDir = appDir + '/jsx';

var srcDir = 'tmp';
var srcDirs = {
  js : srcDir + '/js/**/*.*',
  css : srcDir + '/css/**/*.css',
  img : srcDir + '/img/**/*.*',
  data : srcDir + '/data/*.*',
  html : srcDir + '/**/*.html'
};

var targetDir = 'web';
var targetDirs = {
  js : targetDir + '/js',
  css : targetDir + '/css',
  img : targetDir + '/img',
  data : targetDir + '/data',
  html : targetDir
};

// Gulp tasks
// ----------------------------------------------------------------------------
gulp
    .task(
        'copy-vendor',
        function() {
          gulp
              .src(
                  [
                      './bower_components/bootstrap/dist/css/bootstrap.css',
                      './bower_components/jt.timepicker/jquery.timepicker.css',
                      './bower_components/bootstrap-datepicker/dist/css/bootstrap-datepicker3.css',
                      './bower_components/pikaday/css/pikaday.css' ]).pipe(
                  gulp.dest(srcDir + '/css'));

          return gulp
              .src(
                  [
                      './bower_components/jquery/dist/jquery.js',
                      './bower_components/jquery/dist/jquery-ui.js',
                      './bower_components/datepair.js/dist/datepair.js',
                      './bower_components/datepair.js/dist/jquery.datepair.js',
                      './bower_components/jt.timepicker/jquery.timepicker.js',
                      './bower_components/bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js',
                      './bower_components/moment/moment.js',
                      './bower_components/pikaday/pikaday.js',
                      './bower_components/bootstrap/js/*.js' ]).pipe(
                  gulp.dest(srcDir + '/js'));
        });

gulp.task('compile', [ 'compile-js', 'compile-css', 'compile-img',
    'deploy-data', 'compile-html' ], function() {
});

gulp.task('compile-js', function() {
  bundleApp(false);
  return gulp.src(srcDirs.js)
  .pipe(concat(targetDirs.js + '/all.js'))
  .pipe(gulp.dest(''));
//  .pipe(rename('all.min.js'))
//  .pipe(uglify())
//  .pipe(gulp.dest(''));
});

gulp.task('compile-css', function() {
  return gulp.src(srcDirs.css).pipe(concat('styles.css')).pipe(sass()).pipe(
      minifyCss()).pipe(gulp.dest(targetDirs.css));
});

gulp.task('compile-img', function() {
  return gulp.src(srcDirs.img).pipe(gulp.dest(targetDirs.img));
});

gulp.task('deploy-data', function() {
  return gulp.src(srcDirs.data).pipe(gulp.dest(targetDirs.data));
});

gulp.task('compile-html', function() {
  return gulp.src(srcDirs.html).pipe(gulp.dest(targetDir));
});

gulp.task('server', [ 'watch' ], function() {
  var options = {
    uri : "http://localhost:8000/index.html",
    app : 'chrome'
  };
  return gulp.src(targetDir).pipe(webserver({
    livereload : true
  })).pipe(open(options));
});

gulp.task('all', [ 'default', 'server' ], function() {
});

gulp.task('sync-src', function() {
  return gulp.src(appDir + '/**/*.*', {
    base : appDir
  }).pipe(watch(appDir, {
    base : appDir
  })).pipe(gulp.dest(srcDir));
});

gulp.task('watch', function() {
  gulp.watch(srcDirs.js, [ 'compile-js' ]);
  gulp.watch(srcDirs.css, [ 'compile-css' ]);
  gulp.watch(srcDirs.img, []);
  gulp.watch(srcDirs.html, [ 'compile-html' ]);
});

gulp.task('clean', function() {
  gulp.src(targetDir, {
    read : false
  }).pipe(clean());
  
  return gulp.src(srcDir, {
    read : false
  }).pipe(clean());
});

function bundleApp(isProduction) {
  scriptsCount++;
  var appBundler = browserify({
    entries : jsxcDir + '/app.js',
    debug : true
  })

  if (!isProduction && scriptsCount === 1) {
    browserify({
      require : dependencies,
      debug : true
    }).bundle().on('error', gutil.log).pipe(source('vendors.js')).pipe(
        gulp.dest(srcDir + '/js'));
  }
  if (!isProduction) {
    dependencies.forEach(function(dep) {
      appBundler.external(dep);
    })
  }

  appBundler.transform("babelify", {
    presets : [ "es2015", "react" ]
  }).bundle().on('error', gutil.log).pipe(source('bundle.js')).pipe(
      gulp.dest(srcDir + '/js'));
}

gulp.task('default', [ 'sync-src', 'copy-vendor', 'compile', 'watch' ]);
