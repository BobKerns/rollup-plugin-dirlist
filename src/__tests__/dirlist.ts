import {dirlist} from '..';

describe("Plugin test", () => {
    test("Configure", () => {
        expect(dirlist({
            id: 'root',
            path: ".",
            include: "*.ts",
            exclude: "suite-*"
        })).toEqual({
            name: "dir:root",
            resolveId: expect.any(Function),
            load: expect.any(Function)
        });
    })
});
