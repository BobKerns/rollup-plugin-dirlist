import * as fs from 'fs';

const {readdir, stat} = fs.promises;
import {resolve} from 'path';
import {Plugin} from 'rollup';

import {createFilter} from 'rollup-pluginutils';

export interface DirlistOptions {
    path: string;
    id: string;
    include?: string | string[];
    exclude?: string | string[];
}

export enum EntryType {
    file='file',
    directory='directory',
    link='link'
}

export type TimeStamp = string;

export interface EntryBase<T extends EntryType = EntryType> {
    type: T;
    name: string;
    path: string;
    mtime: TimeStamp;
}

export interface FileEntry extends EntryBase<EntryType.file> {
    size: number;
}

export interface DirectoryEntry extends EntryBase<EntryType.directory> {
    contents: EntryBase[];
}

export interface LinkEntrry extends EntryBase<EntryType.link> {
    size: number;
}

export type Entry = FileEntry | DirectoryEntry | LinkEntrry;

export function dirlist({path: location, id, include, exclude}: DirlistOptions): Plugin {
    const fid = `dir:${id}`;
    const filter = createFilter(include, exclude, {resolve: false});
    return {
        name: fid,
        resolveId: (xid) => {
          if (xid === fid) {
              return xid;
          }
          return undefined;
        },
        load: async (xid) => {
            if(xid !== fid) {
                return null;
            }
            async function scan(p: string, parents: string): Promise<Entry[]> {
                const dir = await readdir(p);
                const val = dir.map(async (name): Promise<Entry | null> => {
                    const path = `${parents}/${name}`;
                    const subPath = resolve(p, name);
                    if (filter(path)) {
                        const s = await stat(subPath);
                        if (s) {
                            if (s.isSymbolicLink()) {
                                return {
                                    type: EntryType.link,
                                    name,
                                    path,
                                    mtime: s.mtime.toISOString(),
                                    size: s.size
                                };
                            } else if (s.isDirectory()) {
                                const contents = await scan(subPath, path);
                                if (contents && contents.length > 0) {
                                    return {
                                        type: EntryType.directory,
                                        name,
                                        path,
                                        contents,
                                        mtime: s.mtime.toISOString()
                                    };
                                }
                            } else if (s.isFile()) {
                                return {
                                    type: EntryType.file,
                                    name,
                                    path,
                                    mtime: s.mtime.toISOString(),
                                    size: s.size
                                };
                            }
                        }
                    }
                    return null;
                });
                const purge = (entry: Entry | null): entry is Entry => !!entry;
                return (await Promise.all(val)).filter(purge);
            }

            const result = {
                type: 'directory',
                name: id,
                contents: await scan(location, id)
            };
            const str = `export default ${JSON.stringify(result)};`;
            return {
                code: str
            };
        }
    };
}
