<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { Tabs } from 'ant-design-vue';

import RuleIndex from './rule/index.vue';
import SinkIndex from './sink/index.vue';

/** IoT 数据流转 */
defineOptions({ name: 'IoTDataRule' });

const activeTabName = ref('rule');
</script>

<template>
  <Page auto-content-height>
    <Tabs v-model:active-key="activeTabName">
      <Tabs.TabPane tab="规则" key="rule">
        <RuleIndex />
      </Tabs.TabPane>
      <Tabs.TabPane tab="目的" key="sink">
        <SinkIndex />
      </Tabs.TabPane>
    </Tabs>
  </Page>
</template>
