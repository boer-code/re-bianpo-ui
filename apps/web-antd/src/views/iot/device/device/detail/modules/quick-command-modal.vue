<script lang="ts" setup>
import type { IotDeviceCommandApi } from '#/api/iot/device/command';

import { computed, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Form, FormItem, Input, message } from 'ant-design-vue';
import { CodeEditor } from '@vben/plugins/code-editor';

import {
  createDeviceCommand,
  updateDeviceCommand,
} from '#/api/iot/device/command';

const emit = defineEmits<{ success: [] }>();

const deviceId = ref<number>(0);
const formData = ref<IotDeviceCommandApi.DeviceCommand>({
  deviceId: 0,
  name: '',
  template: '{\n  "method": "thing.property.set",\n  "params": {}\n}',
});

const isEdit = computed(() => !!formData.value.id);
const title = computed(() => (isEdit.value ? '编辑快捷指令' : '新建快捷指令'));

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (!formData.value.name.trim()) {
      message.warning('请输入指令名称');
      return;
    }
    try {
      JSON.parse(formData.value.template);
    } catch {
      message.error('JSON 模板格式错误');
      return;
    }

    modalApi.lock();
    try {
      const data = {
        ...formData.value,
        deviceId: deviceId.value,
        name: formData.value.name.trim(),
      };
      if (isEdit.value) {
        await updateDeviceCommand(data);
      } else {
        await createDeviceCommand(data);
      }
      message.success(isEdit.value ? '更新成功' : '创建成功');
      emit('success');
      modalApi.close();
    } catch (e: any) {
      message.error(e?.message || '操作失败');
    } finally {
      modalApi.unlock();
    }
  },
  onOpenChange(isOpen: boolean) {
    if (!isOpen) return;
    const data = modalApi.getData<{
      deviceId: number;
      record?: IotDeviceCommandApi.DeviceCommand;
    }>();
    deviceId.value = data?.deviceId || 0;
    if (data?.record) {
      formData.value = { ...data.record };
    } else {
      formData.value = {
        deviceId: data?.deviceId || 0,
        name: '',
        template: '{\n  "method": "thing.property.set",\n  "params": {}\n}',
      };
    }
  },
});
</script>

<template>
  <Modal :title="title" class="w-[560px]">
    <Form layout="vertical" class="mt-4">
      <FormItem label="指令名称" required>
        <Input
          v-model:value="formData.name"
          placeholder="例如：设置温度为25度"
          allow-clear
        />
      </FormItem>
      <FormItem label="JSON 模板" required>
        <div class="h-[260px] border border-gray-200 rounded">
          <CodeEditor
            v-model:value="formData.template"
            mode="application/json"
            :auto-format="false"
            :bordered="true"
          />
        </div>
      </FormItem>
    </Form>
  </Modal>
</template>
