/**
 * Copyright (c) 2017 molio contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { Column } from 'mol-base/collections/database'
import Tokenizer from '../common/text/tokenizer'
import FixedColumn from '../common/text/column/fixed'
import * as Schema from './schema'
import Result from '../result'
import Computation from 'mol-base/computation'

interface State {
    tokenizer: Tokenizer,
    header: Schema.Header,
    numberOfAtoms: number,
    chunker: Computation.Chunker
}

function createEmptyHeader(): Schema.Header {
    return {
        title: '',
        timeInPs: 0,
        hasVelocities: false,
        precision: { position: 0, velocity: 0 },
        box: [0, 0, 0]
    };
}

function State(tokenizer: Tokenizer, ctx: Computation.Context): State {
    return {
        tokenizer,
        header: createEmptyHeader(),
        numberOfAtoms: 0,
        chunker: Computation.chunker(ctx, 100000) // 100000 lines is the default chunk size for this reader
    };
}

/**
 * title string (free format string, optional time in ps after 't=')
 */
function handleTitleString(state: State) {
    const { tokenizer, header } = state;
    let line = Tokenizer.readLine(tokenizer);

    // skip potential empty lines...
    if (line.trim().length === 0) {
        line = Tokenizer.readLine(tokenizer);
    }

    const timeOffset = line.lastIndexOf('t=');
    if (timeOffset >= 0) {
        header.timeInPs = parseFloat(line.substring(timeOffset + 2));
        header.title = line.substring(0, timeOffset).trim();
        if (header.title && header.title[header.title.length - 1] === ',') {
            header.title = header.title.substring(0, header.title.length - 1);
        }
    } else {
        header.title = line;
    }
}

/**
 * number of atoms (free format integer)
 */
function handleNumberOfAtoms(state: State) {
    const { tokenizer } = state;
    Tokenizer.markLine(tokenizer);
    const line = Tokenizer.getTokenString(tokenizer);
    state.numberOfAtoms = parseInt(line);
}

/**
 * This format is fixed, ie. all columns are in a fixed position.
 * Optionally (for now only yet with trjconv) you can write gro files
 * with any number of decimal places, the format will then be n+5
 * positions with n decimal places (n+1 for velocities) in stead
 * of 8 with 3 (with 4 for velocities). Upon reading, the precision
 * will be inferred from the distance between the decimal points
 * (which will be n+5). Columns contain the following information
 * (from left to right):
 *     residue number (5 positions, integer)
 *     residue name (5 characters)
 *     atom name (5 characters)
 *     atom number (5 positions, integer)
 *     position (in nm, x y z in 3 columns, each 8 positions with 3 decimal places)
 *     velocity (in nm/ps (or km/s), x y z in 3 columns, each 8 positions with 4 decimal places)
 */
async function handleAtoms(state: State): Promise<Schema.Atoms> {
    const { tokenizer, numberOfAtoms } = state;
    const lines = await Tokenizer.readLinesAsync(tokenizer, numberOfAtoms, state.chunker);

    const positionSample = tokenizer.data.substring(lines.indices[0], lines.indices[1]).substring(20);
    const precisions = positionSample.match(/\.\d+/g)!;
    const hasVelocities = precisions.length === 6;

    state.header.hasVelocities = hasVelocities;
    state.header.precision.position = precisions[0].length - 1;
    state.header.precision.velocity = hasVelocities ? precisions[3].length - 1 : 0;

    const pO = 20;
    const pW = state.header.precision.position + 5;
    const vO = pO + 3 * pW;
    const vW = state.header.precision.velocity + 4;

    const col = FixedColumn(lines);
    const undef = Column.Undefined(state.numberOfAtoms, Column.Type.float);

    const ret = {
        count: state.numberOfAtoms,
        residueNumber: col(0, 5, Column.Type.int),
        residueName: col(5, 5, Column.Type.str),
        atomName: col(10, 5, Column.Type.str),
        atomNumber: col(15, 5, Column.Type.int),
        x: col(pO, pW, Column.Type.float),
        y: col(pO + pW, pW, Column.Type.float),
        z: col(pO + 2 * pW, pW, Column.Type.float),
        vx: hasVelocities ? col(vO, vW, Column.Type.float) : undef,
        vy: hasVelocities ? col(vO + vW, vW, Column.Type.float) : undef,
        vz: hasVelocities ? col(vO + 2 * vW, vW, Column.Type.float) : undef,
    };

    return ret;
}

/**
 * box vectors (free format, space separated reals), values:
 * v1(x) v2(y) v3(z) v1(y) v1(z) v2(x) v2(z) v3(x) v3(y),
 * the last 6 values may be omitted (they will be set to zero).
 * Gromacs only supports boxes with v1(y)=v1(z)=v2(z)=0.
 */
function handleBoxVectors(state: State) {
    const { tokenizer } = state;
    const values = Tokenizer.readLine(tokenizer).trim().split(/\s+/g);
    state.header.box = [+values[0], +values[1], +values[2]];
}

async function parseInternal(data: string, ctx: Computation.Context): Promise<Result<Schema.File>> {
    const tokenizer = Tokenizer(data);

    ctx.update({ message: 'Parsing...', current: 0, max: data.length });
    const structures: Schema.Structure[] = [];
    while (tokenizer.position < data.length) {
        const state = State(tokenizer, ctx);
        handleTitleString(state);
        handleNumberOfAtoms(state);
        const atoms = await handleAtoms(state);
        handleBoxVectors(state);
        structures.push({ header: state.header, atoms });
    }

    const result: Schema.File = { structures };
    return Result.success(result);
}

export function parse(data: string) {
    return Computation.create<Result<Schema.File>>(async ctx => {
        return await parseInternal(data, ctx);
    });
}

export default parse;