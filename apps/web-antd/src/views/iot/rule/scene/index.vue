<script lang="ts" setup>
import type { VxeTableGridOptions } from '#/adapter/vxe-table';
import type { RuleSceneApi } from '#/api/iot/rule/scene';

import { ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { Card, Col, message, Row } from 'ant-design-vue';

import { ACTION_ICON, TableAction, useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteSceneRule,
  getSceneRulePage,
  updateSceneRuleStatus,
} from '#/api/iot/rule/scene';
import { $t } from '#/locales';

import { useGridColumns, useGridFormSchema } from './data';
import RuleSceneForm from './form/rule-scene-form.vue';

defineOptions({ name: 'IoTRuleScene' });

const [FormDrawer, formDrawerApi] = useVbenDrawer({
  connectedComponent: RuleSceneForm,
});

/** 统计数据 */
const statistics = ref({
  total: 0,
  enabled: 0,
  disabled: 0,
  timerRules: 0,
});

/** 刷新表格 */
function handleRefresh() {
  gridApi.query();
}

/** 创建场景规则 */
function handleCreate() {
  formDrawerApi.setData({}).open();
}

/** 编辑场景规则 */
function handleEdit(row: RuleSceneApi.SceneRule) {
  formDrawerApi.setData({ id: row.id }).open();
}

/** 启用/停用场景规则 */
async function handleToggleStatus(row: RuleSceneApi.SceneRule) {
  const newStatus = row.status === 0 ? 1 : 0;
  const hideLoading = message.loading({
    content: newStatus === 0 ? '正在启用...' : '正在停用...',
    duration: 0,
  });
  try {
    await updateSceneRuleStatus(row.id as number, newStatus);
    message.success({
      content: newStatus === 0 ? '启用成功' : '停用成功',
    });
    handleRefresh();
  } finally {
    hideLoading();
  }
}

/** 删除场景规则 */
async function handleDelete(row: RuleSceneApi.SceneRule) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
  });
  try {
    await deleteSceneRule(row.id as number);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.name]),
    });
    handleRefresh();
  } finally {
    hideLoading();
  }
}

/** 检查规则是否包含定时触发器 */
function hasTimerTrigger(rule: RuleSceneApi.SceneRule): boolean {
  return rule.triggers?.some((trigger: any) => trigger.type === '3') || false;
}

/** 更新统计数据 */
function updateStatistics(list: RuleSceneApi.SceneRule[]) {
  statistics.value = {
    total: list.length,
    enabled: list.filter((item) => item.status === 0).length,
    disabled: list.filter((item) => item.status === 1).length,
    timerRules: list.filter((item) => hasTimerTrigger(item)).length,
  };
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
          const res = await getSceneRulePage({
            pageNo: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
          const list = res.items || res.list || res.records || [];
          updateStatistics(list);
          return res;
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
  } as VxeTableGridOptions<RuleSceneApi.SceneRule>,
});
</script>

<template>
  <Page auto-content-height>
    <Row :gutter="16" class="mb-4">
      <Col :span="6">
        <Card
          :bordered="false"
          class="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div class="flex items-center">
            <div
              class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#667eea] to-[#764ba2] text-2xl text-white"
            >
              <IconifyIcon icon="ep:document" />
            </div>
            <div>
              <div class="text-2xl font-semibold leading-none text-[#303133]">
                {{ statistics.total }}
              </div>
              <div class="mt-1 text-sm text-[#909399]">总规则数</div>
            </div>
          </div>
        </Card>
      </Col>
      <Col :span="6">
        <Card
          :bordered="false"
          class="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div class="flex items-center">
            <div
              class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#f093fb] to-[#f5576c] text-2xl text-white"
            >
              <IconifyIcon icon="ep:check" />
            </div>
            <div>
              <div class="text-2xl font-semibold leading-none text-[#303133]">
                {{ statistics.enabled }}
              </div>
              <div class="mt-1 text-sm text-[#909399]">启用规则</div>
            </div>
          </div>
        </Card>
      </Col>
      <Col :span="6">
        <Card
          :bordered="false"
          class="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div class="flex items-center">
            <div
              class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#4facfe] to-[#00f2fe] text-2xl text-white"
            >
              <IconifyIcon icon="ep:close" />
            </div>
            <div>
              <div class="text-2xl font-semibold leading-none text-[#303133]">
                {{ statistics.disabled }}
              </div>
              <div class="mt-1 text-sm text-[#909399]">禁用规则</div>
            </div>
          </div>
        </Card>
      </Col>
      <Col :span="6">
        <Card
          :bordered="false"
          class="cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        >
          <div class="flex items-center">
            <div
              class="mr-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-[#43e97b] to-[#38f9d7] text-2xl text-white"
            >
              <IconifyIcon icon="ep:timer" />
            </div>
            <div>
              <div class="text-2xl font-semibold leading-none text-[#303133]">
                {{ statistics.timerRules }}
              </div>
              <div class="mt-1 text-sm text-[#909399]">定时规则</div>
            </div>
          </div>
        </Card>
      </Col>
    </Row>

    <FormDrawer @success="handleRefresh" />
    <Grid table-title="场景规则列表">
      <template #toolbar-tools>
        <TableAction
          :actions="[
            {
              label: $t('ui.actionTitle.create', ['场景规则']),
              type: 'primary',
              icon: ACTION_ICON.ADD,
              onClick: handleCreate,
            },
          ]"
        />
      </template>

      <!-- 操作列 -->
      <template #actions="{ row }">
        <TableAction
          :actions="[
            {
              label: row.status === 0 ? '停用' : '启用',
              type: 'link',
              icon:
                row.status === 0
                  ? 'ant-design:stop-outlined'
                  : 'ant-design:check-circle-outlined',
              onClick: handleToggleStatus.bind(null, row),
            },
            {
              label: $t('common.edit'),
              type: 'link',
              icon: ACTION_ICON.EDIT,
              onClick: handleEdit.bind(null, row),
            },
            {
              label: $t('common.delete'),
              type: 'link',
              danger: true,
              icon: ACTION_ICON.DELETE,
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
