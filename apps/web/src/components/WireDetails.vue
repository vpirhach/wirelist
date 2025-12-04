<template>
  <Slider ref="slider" @close="closeSlider" v-if="isOpen">
    <template #header>
      <h2 class="text-xl">{{ t('wires.wire') }} {{ wireTitle }}</h2>
    </template>
    <template #body>
      <div class="space-y-4">
        <WireInputGroup inline outlined :label="t('wires.destination')">
          <WireInput
            :label="t('wires.from')"
            :icon="ArrowRightStartOnRectangleIcon"
            placeholder="03HY013SA0072-08"
            v-model="wireToEdit.fromDestination"
          />
          <WireInput
            :label="t('wires.to')"
            :icon="ArrowRightEndOnRectangleIcon"
            placeholder="03A521-A2P04-08"
            v-model="wireToEdit.toDestination"
          />
        </WireInputGroup>

        <WireInputGroup inline outlined :label="t('wires.address')">
          <WireInput
            :label="t('wires.subcontroller')"
            :icon="ServerStackIcon"
            v-model="wireToEdit.sub"
          />
          <WireInput
            :label="t('wires.word')"
            :icon="ChatBubbleLeftEllipsisIcon"
            v-model="wireToEdit.word"
          />
          <WireInput :label="t('wires.bit')" :icon="HashtagIcon" v-model="wireToEdit.bits" />
        </WireInputGroup>

        <WireInputGroup outlined :label="t('wires.other')">
          <WireInput
            :label="t('wires.wireCode')"
            :icon="InformationCircleIcon"
            v-model="wireToEdit.wireCodeId"
          />
          <WireInput
            :label="t('wires.colorCode')"
            :icon="SwatchIcon"
            v-model="wireToEdit.colorId"
          />
          <WireInput
            :label="t('wires.noteCode')"
            :icon="NewspaperIcon"
            v-model="wireToEdit.noteCode"
          />
          <WireInput
            :label="t('wires.ioType')"
            :icon="LightBulbIcon"
            v-model="wireToEdit.ioTypeId"
          />

          <WireInput
            :label="t('wires.remarks')"
            :icon="DocumentTextIcon"
            v-model="wireToEdit.remarks"
          />
          <WireInput :label="t('wires.power')" :icon="BoltIcon" v-model="wireToEdit.power" />
          <WireInput
            :label="t('wires.origin')"
            :icon="CursorArrowRaysIcon"
            v-model="wireToEdit.origin"
          />
          <WireInput :label="t('wires.network')" :icon="CpuChipIcon" v-model="wireToEdit.powerId" />
        </WireInputGroup>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end space-x-4">
        <Button variant="outline" @click="closeSlider">{{ t('wires.cancel') }}</Button>
        <Button @click="saveWire" variant="primary" :disabled="isSaving">
          {{ isSaving ? t('wires.saving') : t('wires.save') }}
        </Button>
      </div>
    </template>
  </Slider>
</template>

<script lang="ts" setup>
import { onUpdated, ref, useTemplateRef, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMessage } from 'naive-ui'
import Slider from '@/components/Slider.vue'
import WireInput from '@/components/WireInput.vue'
import WireInputGroup from '@/components/WireInputGroup.vue'
import Button from '@/components/Button.vue'

import {
  ArrowRightStartOnRectangleIcon,
  ArrowRightEndOnRectangleIcon,
  LightBulbIcon,
  SwatchIcon,
  NewspaperIcon,
  InformationCircleIcon,
  ServerStackIcon,
  ChatBubbleLeftEllipsisIcon,
  HashtagIcon,
  DocumentTextIcon,
  BoltIcon,
  CursorArrowRaysIcon,
  CpuChipIcon,
} from '@heroicons/vue/24/outline'

import { useWireDetailsStore } from '@/stores/wireDetails'
import { type DataItem } from '@/api/wireslist'
import {
  createChangeRequest,
  wireToChangeRequest,
  type CreateChangeRequestDto,
} from '@/api/changeRequests'

const { t } = useI18n()
const message = useMessage()
const wireDetailsStore = useWireDetailsStore()

const wireDetails = computed(() => wireDetailsStore.wireDetails)
const isOpen = computed(() => wireDetailsStore.isOpen)
const isSaving = ref(false)

const wireTitle = ref('')
const slider = useTemplateRef('slider')
const wireToEdit = ref<DataItem>(wireDetails.value)
const originalWire = ref<DataItem | null>(null)

onUpdated(() => {
  if (wireDetailsStore.isOpen) {
    if (wireDetails.value.id === null) {
      wireTitle.value = t('wires.new')
      originalWire.value = null
    } else {
      wireTitle.value = wireDetails.value.fromDestination
      // Store original values for tracking changes
      originalWire.value = { ...wireDetails.value }
    }

    wireToEdit.value = wireDetails.value
  }
})

async function closeSlider() {
  await slider.value?.onClose()
  wireDetailsStore.closeDetails()
}

async function saveWire() {
  if (!wireToEdit.value) return

  isSaving.value = true

  try {
    if (wireToEdit.value.id === null) {
      // CREATE: Submit as a CREATE change request
      const request: CreateChangeRequestDto = {
        requestType: 'CREATE',
        fromDestination: wireToEdit.value.fromDestination,
        toDestination: wireToEdit.value.toDestination,
        wireCodeId: wireToEdit.value.wireCodeId || undefined,
        colorId: wireToEdit.value.colorId || undefined,
        ioTypeId: wireToEdit.value.ioTypeId?.toString() || undefined,
        sub: wireToEdit.value.sub || undefined,
        word: wireToEdit.value.word || undefined,
        bits: wireToEdit.value.bits || undefined,
        power: wireToEdit.value.power || undefined,
        origin: wireToEdit.value.origin || undefined,
        wireNumber: wireToEdit.value.wireNumber || undefined,
        remarks: wireToEdit.value.remarks || undefined,
        noteCode: wireToEdit.value.noteCode || undefined,
        network: wireToEdit.value.network || undefined,
      }

      await createChangeRequest(request)
      message.success(t('wires.createRequestSubmitted') || 'Create request submitted for review')
    } else {
      // UPDATE: Build changes object and submit as UPDATE change request
      const changes: Record<string, { oldValue: any; newValue: any }> = {}

      if (originalWire.value) {
        // Compare fields and track changes
        const fieldsToCompare: (keyof DataItem)[] = [
          'fromDestination',
          'toDestination',
          'wireCodeId',
          'colorId',
          'ioTypeId',
          'sub',
          'word',
          'bits',
          'power',
          'origin',
          'wireNumber',
          'remarks',
          'noteCode',
          'network',
        ]

        for (const field of fieldsToCompare) {
          const oldVal = originalWire.value[field]
          const newVal = wireToEdit.value[field]
          if (oldVal !== newVal) {
            changes[field] = { oldValue: oldVal, newValue: newVal }
          }
        }
      }

      // Only submit if there are actual changes
      if (Object.keys(changes).length === 0) {
        message.info(t('wires.noChanges') || 'No changes detected')
        await closeSlider()
        return
      }

      const request = wireToChangeRequest(wireToEdit.value, 'UPDATE', changes)
      await createChangeRequest(request)
      message.success(t('wires.updateRequestSubmitted') || 'Update request submitted for review')
    }

    await closeSlider()
  } catch (error) {
    console.error('Error submitting change request:', error)
    message.error(t('wires.submitError') || 'Failed to submit change request')
  } finally {
    isSaving.value = false
  }
}
</script>
