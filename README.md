experimental - do not use

In the course of developing an application, you author a number of modules that each encapsulate some functionality that could be useful in other contexts.  You want to publish these modules as independent packages on NPM.

To publish such a a module to NPM, you could add an appropriate package.json file to the module's sub directory within your applition's source, and `npm publish` from there.  If you had multiple modules that published to NPM like this, they might use one another as dependencies, and keeping package version information up to date amongst the packages would be tedious.  You update package-A to version 2, package-B depends on package-A so you need to bump package-A dependecy version in package-B.  And package-C might depend on package-B and so on.

Lerna is software that solves this versioning complexity.

With a Lerna setup, we can be productive deveolping our application and publishing application modules as packages as a side effect.  But we are missing something.  How do we get feedback on our NPM packages?  

Typically, an NPM package has Github repositiory associated dedicated to it.  Some popular projects, such as Babel, use Lerna successfully.  The Babel Github project stores the source for various individually installable NPM packages.  If you find a bug, you can report it to the Babel monorepo Github project.  It's a Babel-focused mono-repo.

Contrast the Babel use case with our application use case.  Our application is not a library like Babel.  The packages we publish are a side-effect of our application development.  Many packages might not have anything to do with eachother other than happening to be used in the same application.  The application's issue reports should be focused on business logic and UI bugs, not some minutia about NPM package APIs.  It's likely that our application's Github repository isn't even public.  Then there would be no way for the broader developer community to report bugs on our NPM packages or submit pull requests.

So let's consider another way to publish NPM packages while developing an application that affords us individual repositories for each NPM pacakge.

For the module you wanted to publish to NPM, you would move its code out of the application's source, and into a new Github repository.  From there, you would configure it for publishing to NPM and run npm publish.  Then from the application, I would re-integrate my module via `npm install mymodule`.  

Now developers can integrate my module into their projects via `npm install` also.  And the module has its own Github repo project developers for submit pull requests and issue reports.  Great!

But there is a substantial drawback.  If I modify my module, in order for that change to affect my application, I need to `npm publish` from the module directory, and then I need to `npm update` from my application repo.  If I need to change branches or rollback in my application repo, I would need to `npm install` to be sure my published module is on the correct version for that commit.  When I have multiple packages that use eachother as dependencies, versioning would be nightmare.  

This workflow is substantially worse than the Lerna workflow, but at least we have individual public Github projects for each package, so the community can submit issues and pull requests.

How do we get the best of both worlds? We want the turn-key multi-package versioning of Lerna, but want each package to have its own repository.

Enter Herc.

With Herc, you write your application as you would with Lerna.  Publish to NPM with Lerna.  Commit your source as a monorepo.  Then you publish your various packages from within your monorepo to individual Github repos.  Essential, for each package's folder, Herc clones a an associated Github repo, deletes the repos contents at its head, copies over the contents of the package's folder, git commits and pushes.