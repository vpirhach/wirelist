<template>
  <div>
    <form @submit.prevent="handleSearch">
      <div class="relative xl:w-[500px] w-full flex items-center gap-2">
        <UnitList :units="units" @update:units="onUnitsChanged" />

        <NAutoComplete
          size="large"
          v-model:value="wiresStore.searchQuery"
          :placeholder="t('search.placeholder')"
          :options="autoCompleteOptions"
          :get-show="getShowOptions"
          :render-label="renderLabel"
          @select="handleCommandSelect"
          @update:value="handleInputChange"
        >
          <template #prefix>
            <MagnifyingGlassIcon class="w-4 h-4" />
          </template>
          <template #suffix>
            <XMarkIcon
              v-if="wiresStore.searchQuery"
              class="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              @click="clearSearch"
            />
          </template>
        </NAutoComplete>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/solid'
import { useI18n } from 'vue-i18n'
import { NAutoComplete, type SelectOption, NTag } from 'naive-ui'
import { computed, h, ref, type VNodeChild } from 'vue'
import UnitList from '@/components/UnitList.vue'
import { useWiresStore } from '@/stores/wires'

const wiresStore = useWiresStore()
const { t } = useI18n()

const units = computed(() => wiresStore.units)

// Command system
interface Command {
  name: string
  label: string
  description: string
  args: string[]
  example: string
}

const availableCommands: Command[] = [
  {
    name: 'address',
    label: t('commands.address.label'),
    description: t('commands.address.description'),
    args: ['subcontroller', 'word', 'bit'],
    example: t('commands.address.example', { example: '/address 1 7 14' }),
  },
]

const autoCompleteOptions = computed(() => {
  const query = wiresStore.searchQuery

  // Show commands when user types '/'
  if (query.startsWith('/')) {
    const commandPart = query.slice(1).toLowerCase()

    return availableCommands
      .filter((cmd) => cmd.name.toLowerCase().includes(commandPart))
      .map((cmd) => ({
        label: `${cmd.label} `,
        example: `${cmd.example}`,
        description: `${cmd.description}`,
        value: `/${cmd.name} `,
      }))
  }

  return []
})

const getShowOptions = (value: string) => {
  return value.startsWith('/')
}

const handleCommandSelect = (value: string) => {
  wiresStore.updateSearchQuery(value)
  // Don't auto-search on command select, let user add arguments
}

const handleInputChange = (value: string) => {
  wiresStore.updateSearchQuery(value)

  // Auto-search for non-command queries
  if (!value.startsWith('/')) {
    handleSearch()
  }
}

const clearSearch = () => {
  wiresStore.updateSearchQuery('')
  wiresStore.resetAndFetch()
}

const handleSearch = () => {
  const query = wiresStore.searchQuery

  // Parse commands if query starts with '/'
  if (query.startsWith('/')) {
    parseAndExecuteCommand(query)
  } else {
    // Regular search
    wiresStore.updatePageNumber(0)
    wiresStore.fetchWires()
  }
}

const parseAndExecuteCommand = (commandString: string) => {
  const parts = commandString.slice(1).trim().split(/\s+/)
  const commandName = parts[0]
  const args = parts.slice(1)

  const command = availableCommands.find((cmd) => cmd.name === commandName)

  if (!command) {
    console.warn('Unknown command:', commandName)
    return
  }

  // Execute command based on type
  switch (commandName) {
    case 'address':
      if (args.length >= 1) {
        wiresStore.updatePageNumber(0)
        wiresStore.fetchWires()
      }
      break
  }
}

const renderLabel = (option: Command): VNodeChild => [
  h('div', { class: 'flex flex-col gap-1 p-2' }, [
    h('div', { class: 'text-sm font-medium' }, option.label),
    h('small', { class: 'text-xs text-gray-500' }, option.description),
    h('small', { class: 'text-xs text-gray-500' }, option.example),
  ]),
]

const onUnitsChanged = (units: string[]) => {
  console.log(units)

  wiresStore.updateSelectedUnits(units)
  handleSearch()
}
</script>
