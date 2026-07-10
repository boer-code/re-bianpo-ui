<script lang="ts" setup>
import type { IotDeviceApi } from '#/api/iot/device/device';
import type { IotDeviceCommandApi } from '#/api/iot/device/command';
import type { IotProductApi } from '#/api/iot/product/product';

import { onMounted, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  message,
  Popconfirm,
  Row,
  Space,
} from 'ant-design-vue';
import { CodeEditor } from '@vben/plugins/code-editor';
import draggable from 'vuedraggable';

import {
  deleteDeviceCommand,
  getDeviceCommandList,
  updateDeviceCommandSort,
} from '#/api/iot/device/command';
import { sendRawDeviceMessage } from '#/api/iot/device/device';

import QuickCommandModal from './quick-command-modal.vue';

const props = defineProps<{
  device: IotDeviceApi.Device;
  product: IotProductApi.Product;
}>();

const DEFAULT_TEMPLATE = JSON.stringify(
  { method: 'thing.property.set', params: {} },
  null,
  2,
);

const editorValue = ref(DEFAULT_TEMPLATE);
const sending = ref(false);
const quickCommands = ref<IotDeviceCommandApi.DeviceCommand[]>([]);
const selectedId = ref<number | null>(null);

async function loadQuickCommands() {
  if (!props.device?.id) return;
  try {
    quickCommands.value = await getDeviceCommandList(props.device.id);
  } catch {
    quickCommands.value = [];
  }
}

function handleSelect(cmd: IotDeviceCommandApi.DeviceCommand) {
  selectedId.value = cmd.id!;
  editorValue.value = cmd.template;
}

const [QuickCommandFormModal, quickCommandModalApi] = useVbenModal({
  connectedComponent: QuickCommandModal,
  destroyOnClose: true,
});

function handleCreate() {
  quickCommandModalApi.setData({ deviceId: props.device.id }).open();
}

function handleEdit(cmd: IotDeviceCommandApi.DeviceCommand) {
  quickCommandModalApi
    .setData({ deviceId: props.device.id, record: cmd })
    .open();
}

async function handleDelete(cmd: IotDeviceCommandApi.DeviceCommand) {
  try {
    await deleteDeviceCommand(cmd.id!);
    message.success('删除成功');
    if (selectedId.value === cmd.id) {
      selectedId.value = null;
      editorValue.value = DEFAULT_TEMPLATE;
    }
    await loadQuickCommands();
  } catch (e: any) {
    message.error(e?.message || '删除失败');
  }
}

async function handleDragEnd() {
  const ids = quickCommands.value.map((c) => c.id!);
  try {
    await updateDeviceCommandSort(ids);
  } catch {}
}

async function handleSend() {
  try {
    JSON.parse(editorValue.value);
  } catch {
    message.error('JSON 格式错误，请检查');
    return;
  }
  sending.value = true;
  try {
    await sendRawDeviceMessage({
      deviceId: props.device.id!,
      payload: editorValue.value,
    });
    message.success('发送成功');
  } catch (e: any) {
    message.error(e?.message || '发送失败');
  } finally {
    sending.value = false;
  }
}

watch(
  () => props.device?.id,
  (newId) => {
    if (newId) loadQuickCommands();
  },
);

onMounted(() => {
  loadQuickCommands();
});
</script>

<template>
  <Row :gutter="16">
    <!-- 左侧：JSON 编辑器 + 发送 -->
    <Col :span="18">
      <Card title="发送指令" :bordered="false">
        <div class="h-[400px] border border-gray-200 rounded">
          <CodeEditor
            v-model:value="editorValue"
            mode="application/json"
            :auto-format="false"
            :bordered="true"
          />
        </div>
        <div class="mt-3 flex justify-end">
          <Button type="primary" :loading="sending" @click="handleSend">
            发送
          </Button>
        </div>
      </Card>
    </Col>

    <!-- 右侧：快捷指令列表 -->
    <Col :span="6">
      <Card :bordered="false">
        <template #title>
          <div class="flex items-center justify-between">
            <span>快捷指令</span>
            <Button type="primary" size="small" @click="handleCreate">
              新建
            </Button>
          </div>
        </template>
        <div class="command-list">
          <draggable
            v-model="quickCommands"
            item-key="id"
            handle=".drag-handle"
            animation="200"
            @end="handleDragEnd"
          >
            <template #item="{ element }">
              <div
                class="command-item"
                :class="{ active: selectedId === element.id }"
                @click="handleSelect(element)"
              >
                <div class="drag-handle cursor-move mr-2 text-gray-400">
                  ⠿
                </div>
                <div class="flex-1 truncate">{{ element.name }}</div>
                <Space :size="0" class="command-actions">
                  <Button
                    type="link"
                    size="small"
                    @click.stop="handleEdit(element)"
                  >
                    编辑
                  </Button>
                  <Popconfirm
                    title="确认删除该指令？"
                    @confirm="handleDelete(element)"
                  >
                    <Button
                      type="link"
                      size="small"
                      danger
                      @click.stop
                    >
                      删除
                    </Button>
                  </Popconfirm>
                </Space>
              </div>
            </template>
          </draggable>
          <div
            v-if="quickCommands.length === 0"
            class="text-center text-gray-400 py-8"
          >
            暂无快捷指令
          </div>
        </div>
      </Card>
    </Col>
  </Row>

  <!-- 快捷指令新建/编辑弹窗 -->
  <QuickCommandFormModal @success="loadQuickCommands" />
</template>

<style scoped>
.command-list {
  min-height: 400px;
}

.command-item {
  display: flex;
  align-items: center;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.command-item:hover {
  background-color: #f5f5f5;
}

.command-item.active {
  background-color: #e6f4ff;
  border-color: #1677ff;
}

.command-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.command-item:hover .command-actions {
  opacity: 1;
}
</style>
