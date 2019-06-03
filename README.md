# rollup-plugin-dirlist

This plugin allows import of directories into a Javascript program, having them appear as an array of objects in your code.

This happens at compile time, NOT at load or run time. This is for converting a static set of files into runtime data, such as a choice of fixed resources.

For example, a game might cycle through a set of background music as you advance throught the levels. If the music is contained in an assets folder,
the contents might be requested and streamed. Adding the file to the appropriate directory can be all that's needed to add it to the playlist,
simplifying maintenance.

One could envision coupling this with a server endpoint to obtain the same information more dynamically. At the present time, this plugin is not that.

```typescript
import {dirlist} from 'rollup-plugin-dirlist';
import {resolve} from 'path';

export default {
    input: "myfile.ts",
    output: {
        type: "commonjs",
        file: "mybundle.cjs.js"
    },
    plugins: [
        ...[],
        dirlist({
           id: 'audio',
           path: resolve(__dirname, "../assets"),
           include: "*.mp3",
           exclude: "rick-astley-*.mp3" // no rickrolling, please.
        }),
        ...[] // Should come before loaders/transpilers which may reference it.
    ]
};
```

Refer to it like this:
```typescript
import audio from 'dir:audio';

const makePlaylist = (f: any) => {
    switch (f.type) {
        case 'directory':
            return f.contents.map(makePlaylist).flatten();
        case 'link':
            return []; // Ignore maybe?
        case 'file':
            return [
                {
                    name: f.name,
                    size: f.size,
                    mtime: Date.parse(f.mtime),
                    displayedPath: f.path // Relative to audio/
                }
            ];
    }
};

const playlist = makePlaylist(audio);

```
