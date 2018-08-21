/**
 * Copyright (c) 2018 mol* contributors, licensed under MIT, See LICENSE file for more info.
 *
 * @author Alexander Rose <alexander.rose@weirdbyte.de>
 * @author David Sehnal <david.sehnal@gmail.com>
 */

import { Unit, Structure } from 'mol-model/structure';
import { Mat4 } from 'mol-math/linear-algebra'

import { createUniformColor, ColorData, createGroupColor, createGroupInstanceColor, createInstanceColor } from '../../../../util/color-data';
import { createUniformSize, SizeData, createGroupSize, createGroupInstanceSize, createInstanceSize } from '../../../../util/size-data';
import { ValueCell } from 'mol-util';
import { LocationIterator } from '../../../../util/location-iterator';
import { Mesh } from '../../../../mesh/mesh';
import { MeshValues } from 'mol-gl/renderable';
import { getMeshData } from '../../../../util/mesh-data';
import { MeshProps, createMeshValues, createRenderableState, createIdentityTransform } from '../../../util';
import { StructureProps } from '../..';
import { createMarkers } from '../../../../util/marker-data';
import { createMeshRenderObject } from 'mol-gl/render-object';
import { ColorThemeProps, ColorTheme } from 'mol-view/theme/color';
import { SizeThemeProps, SizeTheme } from 'mol-view/theme/size';

export function createTransforms({ units }: Unit.SymmetryGroup, transforms?: ValueCell<Float32Array>) {
    const unitCount = units.length
    const n = unitCount * 16
    const array = transforms && transforms.ref.value.length >= n ? transforms.ref.value : new Float32Array(n)
    for (let i = 0; i < unitCount; i++) {
        Mat4.toArray(units[i].conformation.operator.matrix, array, i * 16)
    }
    return transforms ? ValueCell.update(transforms, array) : ValueCell.create(array)
}

export function createColors(locationIt: LocationIterator, props: ColorThemeProps, colorData?: ColorData) {
    const colorTheme = ColorTheme(props)
    switch (colorTheme.kind) {
        case 'uniform': return createUniformColor(locationIt, colorTheme.color, colorData)
        case 'group': return createGroupColor(locationIt, colorTheme.color, colorData)
        case 'groupInstance': return createGroupInstanceColor(locationIt, colorTheme.color, colorData)
        case 'instance': return createInstanceColor(locationIt, colorTheme.color, colorData)
    }
}

export function createSizes(locationIt: LocationIterator, props: SizeThemeProps, sizeData?: SizeData): SizeData {
    const sizeTheme = SizeTheme(props)
    switch (sizeTheme.kind) {
        case 'uniform': return createUniformSize(locationIt, sizeTheme.size, sizeData)
        case 'group': return createGroupSize(locationIt, sizeTheme.size, sizeData)
        case 'groupInstance': return createGroupInstanceSize(locationIt, sizeTheme.size, sizeData)
        case 'instance': return createInstanceSize(locationIt, sizeTheme.size, sizeData)
    }
}

type StructureMeshProps = Required<MeshProps & StructureProps>

function _createMeshValues(transforms: ValueCell<Float32Array>, mesh: Mesh, locationIt: LocationIterator, props: StructureMeshProps): MeshValues {
    const { instanceCount, groupCount } = locationIt
    const color = createColors(locationIt, props.colorTheme)
    const marker = createMarkers(instanceCount * groupCount)

    const counts = { drawCount: mesh.triangleCount * 3, groupCount, instanceCount }

    return {
        ...getMeshData(mesh),
        ...color,
        ...marker,
        aTransform: transforms,
        elements: mesh.indexBuffer,
        ...createMeshValues(props, counts)
    }
}

export function createComplexMeshValues(structure: Structure, mesh: Mesh, locationIt: LocationIterator, props: StructureMeshProps): MeshValues {
    const transforms = createIdentityTransform()
    return _createMeshValues(transforms, mesh, locationIt, props)
}

export function createUnitsMeshValues(group: Unit.SymmetryGroup, mesh: Mesh, locationIt: LocationIterator, props: StructureMeshProps): MeshValues {
    const transforms = createTransforms(group)
    return _createMeshValues(transforms, mesh, locationIt, props)
}

export function createComplexMeshRenderObject(structure: Structure, mesh: Mesh, locationIt: LocationIterator, props: StructureMeshProps) {
    const values = createComplexMeshValues(structure, mesh, locationIt, props)
    const state = createRenderableState(props)
    return createMeshRenderObject(values, state)
}

export function createUnitsMeshRenderObject(group: Unit.SymmetryGroup, mesh: Mesh, locationIt: LocationIterator, props: StructureMeshProps) {
    const values = createUnitsMeshValues(group, mesh, locationIt, props)
    const state = createRenderableState(props)
    return createMeshRenderObject(values, state)
}

export function updateComplexMeshRenderObject(structure: Structure, mesh: Mesh, locationIt: LocationIterator, props: StructureMeshProps): MeshValues {
    const transforms = createIdentityTransform()
    return _createMeshValues(transforms, mesh, locationIt, props)
}