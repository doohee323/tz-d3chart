var gulp = require('gulp');
var clean = require('gulp-clean');
var concat = require('gulp-concat');
var sass = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var webserver = require('gulp-webserver');
var open = require('gulp-open');
var uglify = require('gulp-uglify');
var sourcemaps = require('gulp-sourcemaps');
var rename = require('gulp-rename');
var addsrc = require('gulp-add-src');

var browserify = require('browserify');
var source = require('vinyl-source-stream');
var gutil = require('gulp-util');
var babelify = require('babelify');

var watch = require('gulp-watch');
var dirSync = require('gulp-directory-sync');

var dependencies = [ 'react', 'react-dom' ];
var scriptsCount = 0;

var srcDir = 'app';
var srcDirs = {
    js : srcDir + '/js/*.js',
    css : srcDir + '/css/*.css',
    img : srcDir + '/img/*.*',
    html : srcDir + '/*.html'
  };
var jsxcDir = srcDir + '/jsx';

var tmpDir = 'tmp';
var tmpDirs = {
  js : tmpDir + '/js/*.*',
  css : tmpDir + '/css/*.css',
  img : tmpDir + '/img/*.*',
  html : tmpDir + '/*.html'
};

var targetDir = 'web';
var targetDirs = {
  js : targetDir + '/js',
  css : targetDir + '/css',
  img : targetDir + '/img',
  html : targetDir
};

gulp.task('compile', [ 'compile-js', 'compile-css', 'compile-img', 'compile-html', 'react' ], function() {
});

gulp.task('compile-js', function() {
  return gulp.src('./bower_components/jquery/dist/jquery.js')
  .pipe(addsrc.append('./bower_components/jquery/dist/jquery-ui.js'))
  .pipe(addsrc.append('./bower_components/datepair.js/dist/datepair.js'))
  .pipe(addsrc.append('./bower_components/datepair.js/dist/jquery.datepair.js'))
  .pipe(addsrc.append('./bower_components/jt.timepicker/jquery.timepicker.js'))
  .pipe(addsrc.append('./bower_components/bootstrap-datepicker/dist/js/bootstrap-datepicker.min.js'))
  .pipe(addsrc.append('./bower_components/moment/moment.js'))
  .pipe(addsrc.append('./bower_components/pikaday/pikaday.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/affix.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/alert.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/dropdown.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/tooltip.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/modal.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/transition.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/button.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/popover.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/carousel.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/scrollspy.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/collapse.js'))
  .pipe(addsrc.append('./bower_components/bootstrap/js/tab.js'))
  .pipe(addsrc.append(tmpDir + '/js/d3.slider.js'))
  .pipe(addsrc.append(tmpDir + '/js/main.js'))
  .pipe(sourcemaps.init())
  .pipe(concat('all.js'))
  .pipe(gulp.dest(targetDirs.js))
  .pipe(rename('all.min.js'))
  .pipe(uglify())
  .pipe(sourcemaps.write('source-maps'))
  .pipe(gulp.dest(targetDirs.js));  
});

gulp.task('react', function() {
  bundleApp(false);
});

gulp.task('compile-css', function() {
  return gulp.src('./bower_components/bootstrap/dist/css/bootstrap.css')
  .pipe(addsrc.append('./bower_components/jt.timepicker/jquery.timepicker.css'))
  .pipe(addsrc.append('./bower_components/bootstrap-datepicker/dist/css/bootstrap-datepicker3.css'))
  .pipe(addsrc.append('./bower_components/pikaday/css/pikaday.css'))
  .pipe(addsrc.append(tmpDir + '/css/d3.slider.css'))
  .pipe(addsrc.append(tmpDir + '/css/main.css'))
  .pipe(sourcemaps.init())
  .pipe(concat('styles.css'))
  .pipe(sass())
  .pipe(minifyCss())
  .pipe(gulp.dest(targetDirs.css));
});

gulp.task('compile-img', function() {
  return gulp.src(tmpDirs.img).pipe(gulp.dest(targetDirs.img));
});

gulp.task('compile-html', function() {
  return gulp.src(tmpDirs.html).pipe(gulp.dest(targetDir));
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

gulp.task('all', [ 'default', 'server', 'sync-data' ], function() {
});

gulp.task('sync-src', function() {
  return gulp.src([srcDirs.js, srcDirs.css, srcDirs.img, srcDirs.html], {
    base : srcDir
  }).pipe(watch(srcDir, {
    base : srcDir
  })).pipe(gulp.dest(tmpDir));
});

gulp.task('watch', function() {
  gulp.watch(tmpDirs.js, [ 'compile-js' ]);
  gulp.watch(tmpDirs.css, [ 'compile-css' ]);
  gulp.watch(tmpDirs.html, [ 'compile-html' ]);
  gulp.watch(tmpDirs.img, ['compile-img']);
  gulp.watch(srcDir + '/data', ['sync-data']);
});

gulp.task('clean', function() {
  gulp.src(targetDir, {
    read : false
  }).pipe(clean());
  
  return gulp.src(tmpDir, {
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
        gulp.dest(targetDirs.js));
  }
  if (!isProduction) {
    dependencies.forEach(function(dep) {
      appBundler.external(dep);
    })
  }

  appBundler.transform("babelify", {
    presets : [ "es2015", "react" ]
  }).bundle().on('error', gutil.log).pipe(source('bundle.js')).pipe(
      gulp.dest(targetDirs.js));
}

gulp.task('sync-data', function() {
  gutil.log(srcDir + '/data'  + '-->' + targetDir + '/data')
  return gulp.src(srcDir + '/data/*.*').pipe(gulp.dest(targetDir + '/data'));
});

gulp.task('default', [ 'sync-src', 'compile', 'watch' ]);
