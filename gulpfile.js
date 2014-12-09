
var gulp = require('gulp'); 


var bower = require('gulp-bower');
var browserify = require('browserify');
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var notify = require("gulp-notify")
var plumber = require('gulp-plumber');  
var react = require('gulp-react');
var reactify = require('reactify'); 
var rename = require("gulp-rename");
var sass = require('gulp-ruby-sass')
var source = require('vinyl-source-stream') 
var transform = require('vinyl-transform');


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

gulp.task('compress', function() {
  gulp.src('./src/js/*.js')
    .pipe(uglify())
    .pipe(gulp.dest('build'))
});

gulp.task('js', function() {
    var browserified = transform(function(filename) {
        var b = browserify(filename, 
        	{debug: true})
        b.require('./src/js/lib/bootstrap3-typeahead.js', {expose: 'bootstrap3-typeahead'});
        b.transform(reactify)
        return b.bundle();
    });
    return gulp.src(['./src/js/app.js'])
        .pipe(dont_break_on_errors())
        .pipe(browserified)
	    .pipe(rename('app.js'))  
	    .pipe(gulp.dest('./build/js/'))   
});

gulp.task('libs', function(){
  return gulp.src([
  	//'./src/js/lib/jquery-2.1.1.min.js',
  	//'./src/js/lib/jquery.scrollintoview.min.js',
  	//'./src/js/lib/smmothscroll.js',
  	//'./src/js/lib/bootstrap.js',
  	//'./src/js/lib/bootstrap3-typeahead.js',
  	//'./bower_components/react/react.js',
  	//'./bower_components/reflux/dist/reflux.js',
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
  gulp.watch('src/js/*', ['js']);
  gulp.watch('src/js/**/*', ['js']);
  gulp.watch('src/js/lib/*.js', ['libs']);
  gulp.watch('src/css/*.scss', ['sass']);
  gulp.watch('src/fonts/*', ['fonts']);
  gulp.watch('src/images/*', ['images']);
});

gulp.task('default', ['watch', 'js', 'libs', 'sass', 'fonts', 'images'])