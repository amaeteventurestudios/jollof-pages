# vendor

`jollof-studio-editor-<version>.tgz` is Jollof Studio's design editor, built from the
`amaeteventurestudios/jollofstudio` repo (`pnpm --filter @jollof/studio-editor pack:tarball`;
see docs/EMBEDDING.md there). It powers the book cover designer at `/books/book-01/cover`.

To update: copy the new tarball here, run `npm install ./vendor/jollof-studio-editor-<version>.tgz`,
and delete the old one.
