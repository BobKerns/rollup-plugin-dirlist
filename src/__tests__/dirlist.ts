import {dirlist} from '..';

import path from 'path';
import {PluginContext} from "rollup";
import {createMockProxy} from "jest-mock-proxy";
import {DirlistOptions} from "../../lib/esm";

describe("Plugin test", () => {
    const spec = {
        id: 'root',
        path: path.resolve(__dirname, "test")
    };

    const filterSpec = {
        ...spec,
        include: "file*",
        exclude: "*2"
    };

    describe("Configuration tests", () => {
        const expected = {
            name: "dir:root",
            resolveId: expect.any(Function),
            load: expect.any(Function)
        };

        test("Configure minimally", () => {
            expect(dirlist(spec)).toEqual(expected);
        });

        test("Configure includes", () => {
            expect(dirlist(filterSpec)).toEqual(expected);
        });
    });

    describe("Resolve tests", () => {
        test("resolveId positive", async () => {
            let plugin = dirlist(spec);
            // We may need a more complete implementation later.
            const ctx: PluginContext = <PluginContext>{};
            expect(plugin.resolveId && await plugin.resolveId.call(ctx, 'dir:root', 'test'))
                .toEqual('dir:root');
        });

        test("resolveId negative", async () => {
            let plugin = dirlist(spec);
            // We may need a more complete implementation later.
            const ctx: PluginContext = createMockProxy();
            // The doc says return null, the type declaration says undefined, and the rollup code doesn't care.
            expect(plugin.resolveId && await plugin.resolveId.call(ctx, 'dir:other', 'test'))
                .not.toEqual(expect.anything);
        });
    });

    const makeValue = (...files: string[]) => (
        {
            name: "root",
            type: "directory",
            contents: expect.arrayContaining(files.map(n => ({
                name: n,
                path: `root/${n}`,
                type: 'file',
                size: 0,
                mtime: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
            })))
        }
);

    describe("Load tests", () => {
        const load = async (spec: DirlistOptions) => {
            let plugin = dirlist(spec);
            const ctx = createMockProxy<PluginContext>();
            const result = plugin && plugin.load && await plugin.load.call(ctx, 'dir:root');
            expect(result).toEqual(expect.objectContaining({
                code: expect.any(String)
            }));
            const code = result && typeof result == 'object' && result.code;
            expect(code).toMatch(/export default {.*};/m);
            const match = code && /export default ({[^;]+});/m.exec(code);
            return match && JSON.parse(match[1]);
        };

        test("Load all", async () => {
            return expect(load(spec))
                .resolves
                .toEqual(makeValue('file1', 'file2', 'notfile'));
        });

        test("Load include", async () => {
            return expect(load({
                ...spec,
                include: "root/file2"
            }))
                .resolves
                .toEqual(makeValue('file2'));
        });

        test("Load include wild", async () => {
            return expect(load({
                ...spec,
                include: "**/file*"
            }))
                .resolves
                .toEqual(makeValue('file1', 'file2'));
        });

        test("Load include wild exclude", async () => {
            return expect(load({
                ...spec,
                include: "root/file*",
                exclude: "**/*1"
            }))
                .resolves
                .toEqual(makeValue('file2'));
        });

        test("Load exclude", async () => {
            return expect(load({
                ...spec,
                exclude: "**/notfile"
            }))
                .resolves
                .toEqual(makeValue('file1', 'file2'));
        });
    });
});
