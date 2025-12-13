const path = require('path');
const { task, src, dest, series } = require('gulp');

task('build:icons', copyIcons);
task('build:templates', copyTemplates);
task('build', series('build:icons', 'build:templates'));

function copyIcons() {
	const nodeSource = path.resolve('nodes', '**', '*.{png,svg}');
	const nodeDestination = path.resolve('dist', 'nodes');

	src(nodeSource).pipe(dest(nodeDestination));

	const credSource = path.resolve('credentials', '**', '*.{png,svg}');
	const credDestination = path.resolve('dist', 'credentials');

	return src(credSource).pipe(dest(credDestination));
}

function copyTemplates() {
	const templatesSource = path.resolve('templates', '**', '*');
	const templatesDestination = path.resolve('dist', 'templates');

	return src(templatesSource).pipe(dest(templatesDestination));
}
