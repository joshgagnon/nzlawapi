console.time('Loading plugins');
var gulp = require('gulp');
var browserify = require('browserify');
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
var rev = require('gulp-rev');
var buffer = require('gulp-buffer');
var gutil = require('gulp-util');
var dereserve = require('gulp-dereserve');

console.timeEnd('Loading plugins');

function string_src(filename, string) {
  var src = require('stream').Readable({ objectMode: true })
  src._read = function () {
    this.push(new gutil.File({ cwd: "", base: "", path: filename, contents: new Buffer(string) }))
    this.push(null)
  }
  return src
}

 var dont_break_on_errors = function(){
    return plumber(
        function(error){
            notify.onError("Error: <%= error.message %>").apply(this, arguments);
            this.emit('end');
        }
    );
};

var MANIFEST = 'build/manifest.json';

gulp.task('js-prod', function() {
  return browserify(
   {debug: false,
    entries: ['./src/js/app.js'],
    transform: [reactify],
    cache: {}, packageCache: {}, fullPaths: false, dedupe: true, sort: true})
    .bundle()
    .pipe(source('app.js'))
    .pipe(streamify(uglify()))
    .pipe(buffer())
    .pipe(rev())
    .pipe(dereserve())
    .pipe(gulp.dest('./build/js'))
    .pipe(rev.manifest(MANIFEST,{
        merge: true
    }))
    .pipe(gulp.dest(''));
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
        //.pipe(dereserve()) //too damn slow
        .pipe(gulp.dest('./build/js/'));
        console.log('Updated!', (Date.now() - updateStart) + 'ms');
  })
    .bundle() // Create the initial bundle when starting the task
    .on('error', function(error){
        notify.onError("Error: <%= error.message %>").apply(this, arguments);
    })
    .pipe(source('app.js'))
    //.pipe(dereserve()) //too damn slow
    .pipe(gulp.dest('./build/js/'));
});


gulp.task('libs', function() {
  return gulp.src('./node_modules/Respond.js/dest/*min.js')
            .pipe(gulp.dest('./build/js'))
});

gulp.task('images', function() {
  return gulp.src('./src/images/*')
    .pipe(gulp.dest('./build/images/'))
});

gulp.task('fonts', function() {
  return gulp.src('./node_modules/font-awesome/fonts/*')
    .pipe(gulp.dest('./build/fonts'))
});

gulp.task('sass-prod', function() { 
    return sass('./src/css/style.scss',
          //  "sourcemap=none": true, //hack to allow autoprefixer to work
            {sourcemap: false, style: 'compressed',
             loadPath: [
                 './src/css',
                 './node_modules/bootstrap-sass/assets/stylesheets',
                 './node_modules/font-awesome/scss',
             ]
         }) 
        .pipe(postcss([ autoprefixer({browsers: ['last 2 version', 'ie 8', 'ie 9', 'ios 6', 'android 4']}) ]))
        .pipe(rev())
        .pipe(gulp.dest('./build/css'))
         .pipe(rev.manifest(MANIFEST,{
            merge: true
        }))
        .pipe(gulp.dest(''));
});

gulp.task('sass', function() { 
    return sass('./src/css/style.scss',
            {sourcemap: true,
             loadPath: [
                 './src/css',
                 './node_modules/bootstrap-sass/assets/stylesheets',
                 './node_modules/font-awesome/scss',
             ]
         }) 
         .pipe(gulp.dest('./build/css')); 
});

gulp.task('watch', function(){
  gulp.watch('src/css/*.scss', ['sass']);
  gulp.watch('src/fonts/*', ['fonts']);
  gulp.watch('src/images/*', ['images']);
});

gulp.task('dev-manifest', function(){
  return string_src(MANIFEST, JSON.stringify({'app.js': 'app.js', 'style.css': 'style.css'}))
    .pipe(gulp.dest('.'))
});


if(process.env.NODE_ENV === 'production'){
  gulp.task('default', ['js-prod', 'sass-prod', 'fonts', 'images', 'libs'])
}
else{
  gulp.task('default', ['watch', 'js', 'sass', 'fonts', 'images', 'libs', 'dev-manifest'])
}
