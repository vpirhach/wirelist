<template>
  <NPopover ref="popover" trigger="click" placement="bottom-end">
    <template #trigger>
      <NButton
        quaternary
        circle
        class="filter-button"
        :class="{
          selected: checkedOptionsCount > 0,
        }"
      >
        <template #icon>
          <NIcon>
            <FunnelIcon v-if="checkedOptionsCount === 0" />
            <FunnelIconSolid v-else />
          </NIcon>
        </template>
      </NButton>
    </template>

    <div class="flex flex-col gap-2">
      <div class="flex gap-2">
        <div v-for="(filter, filterName) in filters" :key="filterName" class="p-1 w-64">
          <div class="text-sm font-medium pb-2 mb-2 border-b border-gray-200">
            {{ filter.label }}
          </div>

          <div class="flex flex-col gap-2">
            <NInput
              v-model:value="searchQuery"
              type="text"
              :placeholder="t('table.filters.searchBy', { label: filter.label.toLowerCase() })"
            />

            <NVirtualList
              style="max-height: 300px"
              :item-size="23"
              :items="filterOptions(filterName).value"
              item-resizable
            >
              <template #default="{ item, index }">
                <div :key="item.key" class="item">
                  <NCheckbox
                    :value="item.key"
                    v-model:checked="checkedOptions[filterName][item.key]"
                    class="pl-1"
                  >
                    <span>{{ item.label }}</span>
                  </NCheckbox>
                </div>
              </template>
            </NVirtualList>
          </div>
        </div>
      </div>

      <div class="flex gap-2 min-w-64 self-end">
        <NButton
          class="grow"
          type="primary"
          @click="applyFilters"
          :disabled="checkedOptionsCount === 0"
        >
          {{
            Object.keys(checkedOptions).length > 0
              ? t('table.filters.applyWithCount', { count: checkedOptionsCount })
              : t('table.filters.apply')
          }}
        </NButton>

        <NButton quaternary circle @click="clearFilter">
          <template #icon>
            <NIcon>
              <TrashIcon />
            </NIcon>
          </template>
        </NButton>
      </div>
    </div>
  </NPopover>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onBeforeMount, type PropType, useTemplateRef } from 'vue'
import { NButton, NIcon, NPopover, NCheckbox, NInput, NVirtualList } from 'naive-ui'
import { FunnelIcon, TrashIcon } from '@heroicons/vue/24/outline'
import { FunnelIcon as FunnelIconSolid } from '@heroicons/vue/24/solid'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  filters: {
    type: Object as PropType<
      Record<string, { label: string; options: { label: string; key: string }[] }>
    >,
    required: true,
  },
})

const emit = defineEmits(['apply'])
const popover = useTemplateRef<typeof NPopover>('popover')
const searchQuery = ref('')

const checkedOptions = reactive<Record<string, Record<string, boolean>>>({})

onBeforeMount(() => {
  Object.keys(props.filters).forEach((filterKey) => {
    checkedOptions[filterKey] = {}
  })
})

const filterOptions = (filterKey: string) =>
  computed(() => {
    return props.filters[filterKey].options.filter((option) => {
      return option.label.toLowerCase().includes(searchQuery.value.toLowerCase())
    })
  })

const { t } = useI18n()

const applyFilters = () => {
  emit(
    'apply',
    Object.entries(checkedOptions)
      // Only emit filters that have at least one checked option
      .filter(([_, value]) => Object.values(value).some(Boolean))
      .reduce(
        (acc, [key, value]) => {
          acc[key] = Object.keys(value).filter((key) => value[key])
          return acc
        },
        {} as Record<string, string[]>,
      ),
  )

  popover.value?.setShow(false)
}

const clearFilter = () => {
  Object.keys(checkedOptions).forEach((key) => {
    checkedOptions[key] = {}
  })

  emit('apply', [])
}

const checkedOptionsCount = computed(() =>
  Object.values(checkedOptions).reduce(
    (acc, value) => acc + Object.values(value).filter(Boolean).length,
    0,
  ),
)
</script>

<style lang="postcss" scoped>
.filter-button {
  &.selected::before {
    position: absolute;
    top: 0;
    left: 0;
    content: '';
    display: block;
    width: 10px;
    height: 10px;
    background-color: #18a058;
    border-radius: 50%;
  }
}
</style>
