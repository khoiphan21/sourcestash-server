module.exports = function (grunt) {
    grunt.initConfig({
        execute: {
            target: {
                src: ['app.js']
            }
        },
        watch: {
            scripts: {
                files: ['app.js'],
                tasks: ['execute'],
                options: {
                    interrupt: true,
                    atBegin: true,
                    spawn: false
                }
            },
        },
        express: {
            options: {
                
            },
            dev: {
                options: {
                    script: 'app.js'
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-execute');
    grunt.loadNpmTasks('grunt-express-server');
};