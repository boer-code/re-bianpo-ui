import type { VbenFormSchema } from '#/adapter/form';
import type { VxeTableGridOptions } from '#/adapter/vxe-table';

import { CommonStatusEnum, DICT_TYPE } from '@vben/constants';
import { getDictOptions } from '@vben/hooks';

import { z } from '#/adapter/form';
import { getAreaTree } from '#/api/system/area';
import { getRangePickerDefaultProps } from '#/utils';

/** 新增/修改的表单 */
export function useFormSchema(): VbenFormSchema[] {
  return [
    {
      component: 'Input',
      fieldName: 'id',
      dependencies: {
        triggerFields: [''],
        show: () => false,
      },
    },
    {
      fieldName: 'name',
      label: '站点名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入站点名称',
      },
      rules: z
        .string()
        .min(1, '站点名称不能为空')
        .max(64, '站点名称长度不能超过 64 个字符'),
    },
    {
      fieldName: 'regionId',
      label: '所在地区',
      component: 'ApiTreeSelect',
      componentProps: {
        api: getAreaTree,
        fieldNames: { label: 'name', value: 'id', children: 'children' },
        placeholder: '请选择省市区',
      },
    },
    {
      fieldName: 'status',
      label: '站点状态',
      component: 'RadioGroup',
      componentProps: {
        options: getDictOptions(DICT_TYPE.COMMON_STATUS, 'number'),
        buttonStyle: 'solid',
        optionType: 'button',
      },
      rules: z.number().default(CommonStatusEnum.ENABLE),
    },
    {
      fieldName: 'description',
      label: '站点描述',
      component: 'Textarea',
      componentProps: {
        placeholder: '请输入站点描述',
        rows: 3,
      },
    },
    {
      fieldName: 'longitude',
      label: '站点经度',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入站点经度',
        class: 'w-full',
        min: -180,
        max: 180,
        precision: 6,
      },
      rules: z
        .number()
        .min(-180, '经度范围为 -180 到 180')
        .max(180, '经度范围为 -180 到 180')
        .optional()
        .nullable(),
    },
    {
      fieldName: 'latitude',
      label: '站点纬度',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入站点纬度',
        class: 'w-full',
        min: -90,
        max: 90,
        precision: 6,
      },
      rules: z
        .number()
        .min(-90, '纬度范围为 -90 到 90')
        .max(90, '纬度范围为 -90 到 90')
        .optional()
        .nullable(),
    },
    {
      fieldName: 'altitude',
      label: '站点海拔(米)',
      component: 'InputNumber',
      componentProps: {
        placeholder: '请输入站点海拔',
        class: 'w-full',
        precision: 2,
      },
      rules: z.number().optional().nullable(),
    },
  ];
}

/** 列表的搜索表单 */
export function useGridFormSchema(): VbenFormSchema[] {
  return [
    {
      fieldName: 'name',
      label: '站点名称',
      component: 'Input',
      componentProps: {
        placeholder: '请输入站点名称',
        allowClear: true,
      },
    },
    {
      fieldName: 'createTime',
      label: '创建时间',
      component: 'RangePicker',
      componentProps: {
        ...getRangePickerDefaultProps(),
        allowClear: true,
      },
    },
  ];
}

/** 列表的字段 */
export function useGridColumns(): VxeTableGridOptions['columns'] {
  return [
    {
      field: 'id',
      title: 'ID',
      minWidth: 100,
    },
    {
      field: 'name',
      title: '站点名称',
      minWidth: 200,
    },
    {
      field: 'regionId',
      title: '所在地区',
      minWidth: 180,
      slots: { default: 'region' },
    },
    {
      field: 'status',
      title: '状态',
      width: 100,
      cellRender: {
        name: 'CellDict',
        props: { type: DICT_TYPE.COMMON_STATUS },
      },
    },
    {
      field: 'description',
      title: '站点描述',
      minWidth: 200,
    },
    {
      field: 'createTime',
      title: '创建时间',
      minWidth: 180,
      formatter: 'formatDateTime',
    },
    {
      field: 'deviceCount',
      title: '设备数量',
      minWidth: 100,
    },
    {
      title: '操作',
      width: 200,
      fixed: 'right',
      slots: { default: 'actions' },
    },
  ];
}
