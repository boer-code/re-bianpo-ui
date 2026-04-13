<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { IotDeviceGroupApi } from '#/api/iot/device/group';

import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { message } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteDeviceGroup, getDeviceGroupPage } from '#/api/iot/device/group';
import { getAreaTree } from '#/api/system/area';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

defineOptions({ name: 'IoTDeviceGroup' });

const router = useRouter();
const areaTree = ref<any[]>([]);

const areaNameMap = computed(() => {
  const result = new Map<number, string>();
  const walk = (nodes: any[] = [], parentPath = '') => {
    nodes.forEach((node) => {
      const currentPath = parentPath ? `${parentPath} / ${node.name}` : node.name;
      result.set(node.id, currentPath);
      if (node.children?.length) {
        walk(node.children, currentPath);
      }
    });
  };
  walk(areaTree.value);
  return result;
});

function getRegionName(regionId?: number) {
  if (!regionId) {
    return '-';
  }
  return areaNameMap.value.get(regionId) || '-';
}

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 创建站点 */
function handleCreate() {
  formModalApi.setData(null).open();
}

/** 编辑站点 */
function handleEdit(row: IotDeviceGroupApi.DeviceGroup) {
  formModalApi.setData(row).open();
}

/** 删除站点 */
async function handleDelete(row: IotDeviceGroupApi.DeviceGroup) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
  });
  try {
    await deleteDeviceGroup(row.id as number);
    message.success($t('ui.actionMessage.deleteSuccess', [row.name]));
    handleRefresh();
  } finally {
    hideLoading();
  }
}

function handleOpenSiteMap(row: IotDeviceGroupApi.DeviceGroup) {
  router.push({
    name: 'IoTSiteMap',
    params: { id: row.id as number },
  });
}

const [Grid, gridApi] = useVbenVxeGrid({
  formOptions: {
    schema: useGridFormSchema(),
  },
  gridOptions: {
    columns: useGridColumns(),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: async ({ page }, formValues) => {
          return await getDeviceGroupPage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
      },
    },
    rowConfig: {
      keyField: 'id',
      isHover: true,
    },
    toolbarConfig: {
      refresh: true,
      search: true,
    },
  } as VxeTableGridOptions<IotDeviceGroupApi.DeviceGroup>,
});

onMounted(async () => {
  areaTree.value = await getAreaTree();
});
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid table-title="站点列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['站点']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              auth: ['iot:device-group:create'],
              onClick: handleCreate,
            },
          ]"
        />
      </template>
      <template #region="{ row }">
        <span>{{ getRegionName(row.regionId) }}</span>
      </template>
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: '3D实景',
              type: 'link',
              icon: 'ant-design:environment-outlined',
              onClick: handleOpenSiteMap.bind(null, row),
            },
            {
              label: $t('common.edit'),
              type: 'link',
              icon: ACTION_ICON.EDIT,
              auth: ['iot:device-group:update'],
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'link',
              danger: true,
              icon: ACTION_ICON.DELETE,
              auth: ['iot:device-group:delete'],
              popConfirm: {
                title: $t('ui.actionMessage.deleteConfirm', [row.name]),
                confirm: handleDelete.bind(null, row),
              },
            },
          ]"
        />
      </template>
    </Grid>
  </Page>
</template>
