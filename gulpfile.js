
var gulp = require('gulp'); 
var browserify = require('browserify');
var source = require('vinyl-source-stream') 
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var plumber = require('gulp-plumber');  
var sass = require('gulp-ruby-sass') ;
var react = require('gulp-react');
var notify = require("gulp-notify") ;
var bower = require('gulp-bower');
var reactify = require('reactify'); 

 


// JS hint task
gulp.task('jshint', function() {
  gulp.src('./src/js/*.js')
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('compress', function() {
  gulp.src('./src/js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('build'))
});

gulp.task('js', function() {
  /*return browserify('./src/js/app.jsx')
  	.bundle()
  	.pipe(plumber())
    .pipe(source('app.js'))
    //.pipe(streamify(uglify()))
    .pipe(gulp.dest('./build/js/'))*/

    var bundler = browserify({
        entries: ['./src/js/app.js'], // Only need initial file, browserify finds the deps
        transform: [reactify], // We want to convert JSX to normal javascript
        debug: true, // Gives us sourcemapping
        cache: {}, packageCache: {}, //fullPaths: true // Requirement of watchify,
         paths:['./bower_components/react']
    })
    .bundle()
    .pipe(source('app.js'))  
    .pipe(gulp.dest('./build/js/'))
});

gulp.task('libs', function(){
  return gulp.src([
  	'./src/js/lib/jquery-2.1.1.min.js',
  	'./src/js/lib/jquery.scrollintoview.min.js',
  	'./src/js/lib/smmothscroll.js',
  	'./src/js/lib/bootstrap.js',
  	'./src/js/lib/bootstrap3-typeahead.js'
  	])
    .pipe(concat('lib.js'))
    .pipe(gulp.dest('./build/js/'))	
});

gulp.task('css', function() {
  return gulp.src('./src/css/*.css')
  	.pipe(plumber())
    .pipe(concat('style.css'))
    .pipe(gulp.dest('./build/css/'))
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
         .pipe(sass({
             style: 'compressed',
             loadPath: [
                 './src/css',
                 './bower_components/bootstrap-sass-official/assets/stylesheets'
             ]
         }) 
            .on("error", notify.onError(function (error) {
                 return "Error: " + error.message;
             }))) 
         .pipe(gulp.dest('./build/css')); 
});

gulp.task('watch', function(){
  // watch for JS changes
  gulp.watch('src/js/*.j*', ['js']);
  gulp.watch('src/js/lib/*.js', ['libs']);
  gulp.watch('src/css/*.scss', ['sass']);
  gulp.watch('src/fonts/*', ['fonts']);
  gulp.watch('src/images/*', ['images']);
});

gulp.task('default', ['watch', 'js', 'libs', 'sass', 'fonts', 'images'])