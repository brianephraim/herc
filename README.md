experimental - use with extreme caution

herc, as in Hercules, slayed the Lerna Hydra by chopping off its various heads.

[lerna] is a package that pubishes various folders into various npm packages.  This is a monorepo.  It takes its name from the Lerna Hydra because each of these folders could be considered a head, and they are unified on the same body (the repo).

herc will publish those folders to their own Github repos individually.  It will create a Github project for each folder if one doesn't exist, or it will commit changes to a Github repo project with the name of that folder.  This doesn't remove code from the monorepo.

Why use herc?

You have modules that depend on one another.  The modules could have utility to other programmers, so you want to publish them to npm for the community.  You decide a monorepo via lerna is a good approach to manage the various modules' inter-dependencies, package versioning and npm publishing.  But how will the community communicate issues/bugs for these packages, or submit pull requests?  Without herc, they would do this through your monorepo's github project.  But your monorepo is sprawling with various projects.  It's not like you have a monorepo because you're writing the next babel with a slew of plugins focused on that one project.  It would be confusing for you and the rest of the community to do all the Githubbing for all your code in the same monorepo project.  You also might not want to have your sprawling monorepo to be public because it has client code.  So you use herc to publish from your monorepo to various Github projects.

Write all your code in the monorepo.  Run `lerna publish` to publish to npm.  Run `node_modules/.bin/herc` to publish to Github.  If you accept a pull request on one of those projects ... I need to write a script to re-import.