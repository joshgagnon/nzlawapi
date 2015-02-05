console.time('Loading plugins');
var gulp = require('gulp');
var bower = require('gulp-bower');
var browserify = require('browserify');
//var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var notify = require("gulp-notify")
var plumber = require('gulp-plumber');
var react = require('gulp-react');
var reactify = require('reactify');
var rename = require("gulp-rename");
var sass = require('gulp-ruby-sass');
var source = require('vinyl-source-stream')
var transform = require('vinyl-transform');
var shim = require('browserify-shim');
var postcss      = require('gulp-postcss');
var autoprefixer = require('autoprefixer-core');
var watchify = require('watchify');
var uglify = require('gulp-uglify');
var streamify = require('gulp-streamify');
console.timeEnd('Loading plugins');

 var dont_break_on_errors = function(){
    return plumber(
        function(error){
            notify.onError("Error: <%= error.message %>").apply(this, arguments);
            this.emit('end');
        }
    );
};

// JS hint task
gulp.task('jshint', function() {
  gulp.src('./src/js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('js-prod', function() {
  return browserify(
   {debug: false,
    entries: ['./src/js/app.js'],
    transform: [reactify],
    cache: {}, packageCache: {}, fullPaths: true})
    .bundle()
    .pipe(source('app.js'))
    .pipe(streamify(uglify()))
    .pipe(gulp.dest('./build/js/'));
});

gulp.task('js', function() {
  var bundler = browserify(
   {debug: true,
    entries: ['./src/js/app.js'],
    transform: [reactify],
    cache: {}, packageCache: {}, fullPaths: true})
  var watcher  = watchify(bundler);
  return watcher
    .on('update', function () { // When any files update
      var updateStart = Date.now();
      console.log('Updating!');
      watcher
        .bundle() // Create new bundle that uses the cache for high performance
       .on('error', function(error){
          notify.onError("Error: <%= error.message %>").apply(this, arguments);
      })
        .pipe(source('app.js'))
        .pipe(gulp.dest('./build/js/'));
        console.log('Updated!', (Date.now() - updateStart) + 'ms');
  })
    .bundle() // Create the initial bundle when starting the task
    .on('error', function(error){
        notify.onError("Error: <%= error.message %>").apply(this, arguments);
    })
    .pipe(source('app.js'))
    .pipe(gulp.dest('./build/js/'));
});


gulp.task('fonts', function() {
  return gulp.src('./src/fonts/*')
    .pipe(gulp.dest('./build/fonts/bootstrap'))
});

gulp.task('images', function() {
  return gulp.src('./src/images/*')
    .pipe(gulp.dest('./build/images/'))
});

gulp.task('bower', function() { 
    return bower()
         .pipe(gulp.dest('./bower_components' ) );
});

gulp.task('sass', function() { 
    return gulp.src('./src/css/style.scss')
        .pipe(dont_break_on_errors())
         .pipe(sass({
             style: 'compressed',
            "sourcemap=none": true, //hack to allow autoprefixer to work
             loadPath: [
                 './src/css',
                 './bower_components/bootstrap-sass-official/assets/stylesheets'
             ]
         }) )
        .pipe(postcss([ autoprefixer({browsers: ['last 2 version', 'ie 8', 'ie 9', 'ios 6', 'android 4']}) ]))
         .pipe(gulp.dest('./build/css')); 
});

gulp.task('watch', function(){
  gulp.watch('src/css/*.scss', ['sass']);
  gulp.watch('src/fonts/*', ['fonts']);
  gulp.watch('src/images/*', ['images']);
});

gulp.task('default', ['watch', 'js', 'sass', 'fonts', 'images'])
gulp.task('prod', ['js-prod', 'sass', 'fonts', 'images'])
