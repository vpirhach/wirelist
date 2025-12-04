# Generic Data Management System Architecture

> **Goal**: Transform the wirelist application into a flexible, schema-driven data management platform that can handle any table with configurable columns, search criteria, and commands.

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Proposed Architecture](#proposed-architecture)
3. [Table Structure Definition](#1-table-structure-definition-schema-registry)
4. [Dynamic Search Criteria](#2-dynamic-search-criteria-system)
5. [Command System](#3-extensible-command-system)
6. [Frontend Components](#4-frontend-generic-table-component)
7. [Database Schema](#5-database-schema-for-table-definitions)
8. [Implementation Roadmap](#implementation-roadmap)
9. [Quick Win: Minimal Refactor](#quick-win-minimal-refactor)

---

## Current State Analysis

The current application is tightly coupled to the "wires" domain:

| Layer | Current Implementation | Limitation |
|-------|----------------------|------------|
| **Frontend** | Column definitions hardcoded in `MainList.vue` | Can't add new tables without code changes |
| **Backend** | `WiresService` with wire-specific fields | Each new entity requires new service |
| **Commands** | Single `/address` command in `command-parser.ts` | Hard to extend with new commands |
| **Schema** | Fixed Prisma model for wires | Database changes require migrations |

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vue.js)                        │
├─────────────────────────────────────────────────────────────────┤
│  GenericDataTable.vue  │  SearchBuilder.vue  │  CommandInput.vue│
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (NestJS)                         │
├─────────────────────────────────────────────────────────────────┤
│  GenericQueryService  │  CommandRegistry  │  SchemaService      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
├─────────────────────────────────────────────────────────────────┤
│  table_schemas  │  table_commands  │  [dynamic_tables...]       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Table Structure Definition (Schema Registry)

Create a dynamic schema definition system that stores table metadata.

### Type Definitions

```typescript
// types/schema.types.ts

interface ColumnDefinition {
  key: string;                    // Field name in database
  label: string;                  // Display name (supports i18n keys)
  type: 'string' | 'number' | 'date' | 'boolean' | 'enum';
  required?: boolean;
  searchable?: boolean;           // Include in text search
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  fixed?: 'left' | 'right';
  enumValues?: string[];          // For enum types
  visible?: boolean;              // Show/hide by default
  editable?: boolean;             // Allow inline editing
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

interface TableDefinition {
  id: string;                     // Unique table identifier
  name: string;                   // Display name
  tableName: string;              // Database table name
  primaryKey: string;
  columns: ColumnDefinition[];
  defaultSort?: { key: string; order: 'asc' | 'desc' }[];
  features?: {
    audit?: boolean;              // Enable audit trail
    softDelete?: boolean;         // Use soft delete
    versioning?: boolean;         // Track versions
    changeRequests?: boolean;     // Require approval for changes
  };
}
```

### Example Configuration

```typescript
// configs/tables/wires.table.ts

const wiresTableDef: TableDefinition = {
  id: 'wires',
  name: 'Wires List',
  tableName: 'wireslist',
  primaryKey: 'id',
  columns: [
    { 
      key: 'fromDestination', 
      label: 'table.from', 
      type: 'string', 
      searchable: true, 
      sortable: true,
      fixed: 'left',
      required: true 
    },
    { 
      key: 'toDestination', 
      label: 'table.to', 
      type: 'string', 
      searchable: true, 
      sortable: true,
      fixed: 'left',
      required: true 
    },
    { 
      key: 'sub', 
      label: 'table.subcontroller', 
      type: 'number', 
      filterable: true,
      width: 80 
    },
    { 
      key: 'word', 
      label: 'table.word', 
      type: 'number', 
      filterable: true,
      width: 80 
    },
    { 
      key: 'bits', 
      label: 'table.bit', 
      type: 'number', 
      filterable: true,
      width: 80 
    },
    { 
      key: 'remarks', 
      label: 'table.remarks', 
      type: 'string', 
      searchable: true 
    },
    { 
      key: 'power', 
      label: 'table.power', 
      type: 'string' 
    },
    { 
      key: 'origin', 
      label: 'table.origin', 
      type: 'string',
      visible: false  // Hidden by default, shown in extended view
    },
    { 
      key: 'network', 
      label: 'table.network', 
      type: 'string',
      visible: false 
    },
  ],
  defaultSort: [
    { key: 'fromDestination', order: 'asc' },
    { key: 'toDestination', order: 'asc' }
  ],
  features: {
    audit: true,
    changeRequests: true,
  },
};
```

---

## 2. Dynamic Search Criteria System

Create a flexible search criteria builder that can generate complex queries.

### Type Definitions

```typescript
// types/search.types.ts

type Operator = 
  | 'equals' 
  | 'notEquals'
  | 'contains' 
  | 'notContains'
  | 'startsWith' 
  | 'endsWith'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'in' | 'notIn'
  | 'between'
  | 'isNull' | 'isNotNull';

interface SearchCriterion {
  field: string;
  operator: Operator;
  value: any;
  caseSensitive?: boolean;
}

interface SearchGroup {
  logic: 'AND' | 'OR';
  criteria: (SearchCriterion | SearchGroup)[];
}

interface SearchConfig {
  tableId: string;
  criteria?: SearchGroup;
  keyword?: string;              // Full-text search across searchable fields
  pagination?: { 
    page: number; 
    size: number; 
  };
  sort?: { 
    field: string; 
    order: 'asc' | 'desc'; 
  }[];
}
```

### Backend Implementation

```typescript
// modules/generic/generic-query.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SchemaService } from './schema.service';
import { SearchConfig, SearchGroup, SearchCriterion } from './types/search.types';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

@Injectable()
export class GenericQueryService {
  constructor(
    private prisma: PrismaService,
    private schemaService: SchemaService,
  ) {}

  async executeSearch(config: SearchConfig): Promise<PaginatedResponseDto<any>> {
    const tableSchema = await this.schemaService.getTableSchema(config.tableId);
    
    if (!tableSchema) {
      throw new NotFoundException(`Table schema '${config.tableId}' not found`);
    }

    let whereClause: any = {};

    // Build where clause from criteria
    if (config.criteria) {
      whereClause = this.buildWhereClause(config.criteria, tableSchema);
    }

    // Add keyword search across searchable fields
    if (config.keyword) {
      const keywordConditions = this.buildKeywordSearch(config.keyword, tableSchema);
      whereClause = whereClause.AND 
        ? { AND: [...whereClause.AND, keywordConditions] }
        : { AND: [whereClause, keywordConditions] };
    }

    const orderBy = this.buildOrderBy(config.sort, tableSchema);
    const skip = (config.pagination?.page ?? 0) * (config.pagination?.size ?? 30);
    const take = config.pagination?.size ?? 30;

    // Dynamic Prisma query
    const model = (this.prisma as any)[tableSchema.tableName];
    
    const [data, total] = await Promise.all([
      model.findMany({
        where: whereClause,
        skip,
        take,
        orderBy,
      }),
      model.count({ where: whereClause }),
    ]);

    return new PaginatedResponseDto(
      data, 
      total, 
      config.pagination?.page ?? 0, 
      config.pagination?.size ?? 30
    );
  }

  private buildWhereClause(group: SearchGroup, schema: TableDefinition): any {
    const conditions = group.criteria.map(item => {
      if ('logic' in item) {
        // Nested group
        return this.buildWhereClause(item as SearchGroup, schema);
      }
      return this.buildCriterion(item as SearchCriterion, schema);
    }).filter(Boolean);

    if (conditions.length === 0) return {};
    
    return group.logic === 'AND' 
      ? { AND: conditions } 
      : { OR: conditions };
  }

  private buildCriterion(criterion: SearchCriterion, schema: TableDefinition): any {
    const mode = criterion.caseSensitive ? undefined : 'insensitive';
    const { field, operator, value } = criterion;

    switch (operator) {
      case 'equals':
        return { [field]: value };
      case 'notEquals':
        return { [field]: { not: value } };
      case 'contains':
        return { [field]: { contains: value, mode } };
      case 'notContains':
        return { NOT: { [field]: { contains: value, mode } } };
      case 'startsWith':
        return { [field]: { startsWith: value, mode } };
      case 'endsWith':
        return { [field]: { endsWith: value, mode } };
      case 'gt':
        return { [field]: { gt: value } };
      case 'gte':
        return { [field]: { gte: value } };
      case 'lt':
        return { [field]: { lt: value } };
      case 'lte':
        return { [field]: { lte: value } };
      case 'in':
        return { [field]: { in: value } };
      case 'notIn':
        return { [field]: { notIn: value } };
      case 'between':
        return { [field]: { gte: value[0], lte: value[1] } };
      case 'isNull':
        return { [field]: null };
      case 'isNotNull':
        return { NOT: { [field]: null } };
      default:
        return null;
    }
  }

  private buildKeywordSearch(keyword: string, schema: TableDefinition): any {
    const searchableFields = schema.columns.filter(col => col.searchable);
    
    if (searchableFields.length === 0) return {};

    return {
      OR: searchableFields.map(col => ({
        [col.key]: { contains: keyword, mode: 'insensitive' }
      }))
    };
  }

  private buildOrderBy(
    sort: { field: string; order: 'asc' | 'desc' }[] | undefined, 
    schema: TableDefinition
  ): any[] {
    if (sort && sort.length > 0) {
      return sort.map(s => ({ [s.field]: s.order }));
    }
    
    // Use default sort from schema
    if (schema.defaultSort) {
      return schema.defaultSort.map(s => ({ [s.key]: s.order }));
    }
    
    return [{ [schema.primaryKey]: 'asc' }];
  }
}
```

---

## 3. Extensible Command System

Create a pluggable command architecture that allows registering new commands at runtime.

### Type Definitions

```typescript
// common/commands/command.types.ts

interface CommandParameter {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required: boolean;
  position: number;
  description: string;
  default?: any;
}

interface ParsedArgs {
  [key: string]: any;
}

interface CommandContext {
  tableId: string;
  tableSchema: TableDefinition;
  currentFilters?: SearchGroup;
  user?: User;
}

interface CommandDefinition {
  name: string;                    // e.g., 'address'
  aliases?: string[];              // e.g., ['addr', 'a']
  description: string;
  syntax: string;                  // e.g., '/address <sub> <word> [bits]'
  parameters: CommandParameter[];
  tableIds?: string[];             // Limit to specific tables, or undefined for all
  handler: (args: ParsedArgs, context: CommandContext) => SearchGroup | null;
}

type CommandResult = SearchGroup | null;
```

### Command Registry Implementation

```typescript
// common/commands/command-registry.ts

import { Injectable, Logger } from '@nestjs/common';
import { 
  CommandDefinition, 
  CommandResult, 
  CommandContext, 
  ParsedArgs 
} from './command.types';

@Injectable()
export class CommandRegistry {
  private readonly logger = new Logger(CommandRegistry.name);
  private commands = new Map<string, CommandDefinition>();

  /**
   * Register a new command
   */
  register(command: CommandDefinition): void {
    this.commands.set(command.name.toLowerCase(), command);
    
    // Register aliases
    command.aliases?.forEach(alias => {
      this.commands.set(alias.toLowerCase(), command);
    });
    
    this.logger.log(`Registered command: /${command.name}`);
  }

  /**
   * Execute a command string
   */
  execute(input: string, context: CommandContext): CommandResult {
    if (!input.startsWith('/')) {
      return null;
    }

    const parts = input.slice(1).trim().split(/\s+/);
    const cmdName = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    const command = this.commands.get(cmdName);
    
    if (!command) {
      this.logger.debug(`Unknown command: ${cmdName}`);
      return null;
    }

    // Check if command is applicable to current table
    if (command.tableIds && !command.tableIds.includes(context.tableId)) {
      this.logger.debug(`Command ${cmdName} not applicable to table ${context.tableId}`);
      return null;
    }

    const parsedArgs = this.parseArgs(args, command.parameters);
    
    // Validate required parameters
    for (const param of command.parameters) {
      if (param.required && parsedArgs[param.name] === undefined) {
        this.logger.warn(`Missing required parameter: ${param.name} for command ${cmdName}`);
        return null;
      }
    }

    return command.handler(parsedArgs, context);
  }

  /**
   * Check if input is a command
   */
  isCommand(input: string | undefined | null): boolean {
    return input != null && input.trim().startsWith('/');
  }

  /**
   * Get all available commands for a table
   */
  getCommandsForTable(tableId: string): CommandDefinition[] {
    const uniqueCommands = new Map<string, CommandDefinition>();
    
    for (const [key, cmd] of this.commands) {
      if (key === cmd.name && (!cmd.tableIds || cmd.tableIds.includes(tableId))) {
        uniqueCommands.set(cmd.name, cmd);
      }
    }
    
    return Array.from(uniqueCommands.values());
  }

  /**
   * Get help text for all commands
   */
  getHelp(tableId?: string): string {
    const commands = tableId 
      ? this.getCommandsForTable(tableId)
      : [...new Set(this.commands.values())];

    return commands.map(cmd => 
      `${cmd.syntax}\n  ${cmd.description}`
    ).join('\n\n');
  }

  private parseArgs(args: string[], parameters: CommandParameter[]): ParsedArgs {
    const result: ParsedArgs = {};

    for (const param of parameters) {
      const rawValue = args[param.position];
      
      if (rawValue === undefined) {
        if (param.default !== undefined) {
          result[param.name] = param.default;
        }
        continue;
      }

      switch (param.type) {
        case 'number':
          const num = parseInt(rawValue, 10);
          if (!isNaN(num)) {
            result[param.name] = num;
          }
          break;
        case 'boolean':
          result[param.name] = rawValue.toLowerCase() === 'true';
          break;
        default:
          result[param.name] = rawValue;
      }
    }

    return result;
  }
}
```

### Registering Commands

```typescript
// common/commands/commands.module.ts

import { Module, OnModuleInit } from '@nestjs/common';
import { CommandRegistry } from './command-registry';

@Module({
  providers: [CommandRegistry],
  exports: [CommandRegistry],
})
export class CommandsModule implements OnModuleInit {
  constructor(private commandRegistry: CommandRegistry) {}

  onModuleInit() {
    this.registerBuiltInCommands();
  }

  private registerBuiltInCommands() {
    // Address command (for wires table)
    this.commandRegistry.register({
      name: 'address',
      aliases: ['addr', 'a'],
      description: 'Search by sub/word/bits address',
      syntax: '/address <sub> [word] [bits]',
      tableIds: ['wires'],
      parameters: [
        { name: 'sub', type: 'number', required: true, position: 0, description: 'Subcontroller number' },
        { name: 'word', type: 'number', required: false, position: 1, description: 'Word number' },
        { name: 'bits', type: 'number', required: false, position: 2, description: 'Bits value' },
      ],
      handler: (args) => ({
        logic: 'AND',
        criteria: [
          args.sub !== undefined && { field: 'sub', operator: 'equals', value: args.sub },
          args.word !== undefined && { field: 'word', operator: 'equals', value: args.word },
          args.bits !== undefined && { field: 'bits', operator: 'equals', value: args.bits },
        ].filter(Boolean) as any[],
      }),
    });

    // Range command (for wires table)
    this.commandRegistry.register({
      name: 'range',
      aliases: ['r'],
      description: 'Search by destination range',
      syntax: '/range <prefix>',
      tableIds: ['wires'],
      parameters: [
        { name: 'prefix', type: 'string', required: true, position: 0, description: 'Destination prefix' },
      ],
      handler: (args) => ({
        logic: 'OR',
        criteria: [
          { field: 'fromDestination', operator: 'startsWith', value: args.prefix },
          { field: 'toDestination', operator: 'startsWith', value: args.prefix },
        ],
      }),
    });

    // Filter command (generic - works on all tables)
    this.commandRegistry.register({
      name: 'filter',
      aliases: ['f'],
      description: 'Filter by field value',
      syntax: '/filter <field> <operator> <value>',
      parameters: [
        { name: 'field', type: 'string', required: true, position: 0, description: 'Field name' },
        { name: 'operator', type: 'string', required: true, position: 1, description: 'Operator (eq, contains, gt, lt)' },
        { name: 'value', type: 'string', required: true, position: 2, description: 'Value to filter by' },
      ],
      handler: (args, context) => {
        const operatorMap: Record<string, string> = {
          'eq': 'equals',
          '=': 'equals',
          'contains': 'contains',
          'like': 'contains',
          'gt': 'gt',
          '>': 'gt',
          'gte': 'gte',
          '>=': 'gte',
          'lt': 'lt',
          '<': 'lt',
          'lte': 'lte',
          '<=': 'lte',
          'starts': 'startsWith',
          'ends': 'endsWith',
        };

        const operator = operatorMap[args.operator.toLowerCase()] || 'equals';
        
        // Validate field exists in schema
        const column = context.tableSchema.columns.find(c => c.key === args.field);
        if (!column) return null;

        // Convert value based on column type
        let value = args.value;
        if (column.type === 'number') {
          value = parseInt(args.value, 10);
          if (isNaN(value)) return null;
        }

        return {
          logic: 'AND',
          criteria: [{ field: args.field, operator: operator as any, value }],
        };
      },
    });

    // Help command
    this.commandRegistry.register({
      name: 'help',
      aliases: ['h', '?'],
      description: 'Show available commands',
      syntax: '/help',
      parameters: [],
      handler: (args, context) => {
        // This is a special command that doesn't return search criteria
        // Frontend should handle it differently
        return null;
      },
    });
  }
}
```

---

## 4. Frontend: Generic Table Component

### GenericDataTable.vue

```vue
<!-- components/generic/GenericDataTable.vue -->
<template>
  <ScrollableContainer :scroll-amount="300">
    <table class="w-full border-collapse bg-white text-sm whitespace-nowrap">
      <thead class="bg-gray-50 border-b-2 border-gray-200">
        <tr>
          <!-- Checkbox Column -->
          <th v-if="selectable" class="px-4 py-3 w-12 sticky top-0 bg-gray-50 z-10">
            <NCheckbox
              :checked="isAllSelected"
              :indeterminate="isSomeSelected"
              @update:checked="toggleSelectAll"
            />
          </th>
          
          <!-- Data Columns -->
          <th
            v-for="column in visibleColumns"
            :key="column.key"
            class="px-4 py-3 text-left font-semibold text-gray-700 border-b-2 border-gray-200 sticky top-0 bg-gray-50 z-10 whitespace-nowrap cursor-pointer hover:bg-gray-100"
            :class="{ 
              'sticky left-0': column.fixed === 'left',
              'sticky right-0': column.fixed === 'right' 
            }"
            :style="column.width ? { width: `${column.width}px` } : {}"
            @click="column.sortable && handleSort(column.key)"
          >
            <div class="flex items-center gap-2">
              {{ getColumnLabel(column) }}
              <SortIcon 
                v-if="column.sortable" 
                :direction="getSortDirection(column.key)" 
              />
            </div>
          </th>
        </tr>
      </thead>
      
      <tbody>
        <tr 
          v-for="(row, rowIndex) in data" 
          :key="getRowId(row)"
          class="transition-colors duration-200 hover:bg-gray-200 even:bg-gray-100"
        >
          <!-- Checkbox Cell -->
          <td v-if="selectable" class="px-4 py-1 text-center border-b border-gray-100">
            <NCheckbox 
              :checked="isRowSelected(row)" 
              @update:checked="toggleRowSelection(row)" 
            />
          </td>
          
          <!-- Data Cells -->
          <td
            v-for="column in visibleColumns"
            :key="column.key"
            class="px-2 py-1 text-gray-800 border-b border-gray-100"
            :class="{ 
              'sticky left-0 bg-inherit': column.fixed === 'left',
              'sticky right-0 bg-inherit': column.fixed === 'right' 
            }"
          >
            <component
              :is="getCellComponent(column)"
              :value="row[column.key]"
              :column="column"
              :row="row"
              :editable="editable && column.editable !== false"
              @update="(newValue) => handleCellUpdate(row, column.key, newValue)"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </ScrollableContainer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NCheckbox } from 'naive-ui';
import { useI18n } from 'vue-i18n';
import type { ColumnDefinition } from '@/types/schema.types';
import ScrollableContainer from '../ScrollableContainer.vue';
import TextCell from './cells/TextCell.vue';
import NumberCell from './cells/NumberCell.vue';
import DateCell from './cells/DateCell.vue';
import BooleanCell from './cells/BooleanCell.vue';
import EnumCell from './cells/EnumCell.vue';

interface Props {
  schema: {
    primaryKey: string;
    columns: ColumnDefinition[];
  };
  data: Record<string, any>[];
  selectable?: boolean;
  editable?: boolean;
  visibleColumnKeys?: string[];
}

const props = withDefaults(defineProps<Props>(), {
  selectable: true,
  editable: true,
});

const emit = defineEmits<{
  'cell-updated': [row: Record<string, any>, key: string, newValue: any, oldValue: any];
  'selection-changed': [selectedRows: Record<string, any>[]];
  'sort-changed': [sort: { field: string; order: 'asc' | 'desc' }];
}>();

const { t } = useI18n();

// Selection state
const selectedRows = ref<Set<string | number>>(new Set());

// Sort state
const currentSort = ref<{ field: string; order: 'asc' | 'desc' } | null>(null);

// Computed
const visibleColumns = computed(() => {
  let columns = props.schema.columns;
  
  if (props.visibleColumnKeys && props.visibleColumnKeys.length > 0) {
    columns = columns.filter(col => props.visibleColumnKeys!.includes(col.key));
  } else {
    columns = columns.filter(col => col.visible !== false);
  }
  
  return columns;
});

const isAllSelected = computed(() => 
  props.data.length > 0 && selectedRows.value.size === props.data.length
);

const isSomeSelected = computed(() => 
  selectedRows.value.size > 0 && selectedRows.value.size < props.data.length
);

// Methods
const getRowId = (row: Record<string, any>): string | number => {
  return row[props.schema.primaryKey] ?? row.id;
};

const getColumnLabel = (column: ColumnDefinition): string => {
  // Try i18n first, fall back to label
  try {
    return t(column.label);
  } catch {
    return column.label;
  }
};

const getCellComponent = (column: ColumnDefinition) => {
  switch (column.type) {
    case 'number': return NumberCell;
    case 'date': return DateCell;
    case 'boolean': return BooleanCell;
    case 'enum': return EnumCell;
    default: return TextCell;
  }
};

const getSortDirection = (key: string): 'asc' | 'desc' | null => {
  if (currentSort.value?.field === key) {
    return currentSort.value.order;
  }
  return null;
};

const handleSort = (key: string) => {
  if (currentSort.value?.field === key) {
    currentSort.value.order = currentSort.value.order === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort.value = { field: key, order: 'asc' };
  }
  emit('sort-changed', currentSort.value);
};

const isRowSelected = (row: Record<string, any>): boolean => {
  return selectedRows.value.has(getRowId(row));
};

const toggleRowSelection = (row: Record<string, any>) => {
  const id = getRowId(row);
  if (selectedRows.value.has(id)) {
    selectedRows.value.delete(id);
  } else {
    selectedRows.value.add(id);
  }
  emitSelectionChanged();
};

const toggleSelectAll = (checked: boolean) => {
  if (checked) {
    props.data.forEach(row => selectedRows.value.add(getRowId(row)));
  } else {
    selectedRows.value.clear();
  }
  emitSelectionChanged();
};

const emitSelectionChanged = () => {
  const selected = props.data.filter(row => isRowSelected(row));
  emit('selection-changed', selected);
};

const handleCellUpdate = (row: Record<string, any>, key: string, newValue: any) => {
  const oldValue = row[key];
  if (newValue !== oldValue) {
    emit('cell-updated', row, key, newValue, oldValue);
  }
};

// Expose methods
defineExpose({
  clearSelection: () => {
    selectedRows.value.clear();
    emitSelectionChanged();
  },
  getSelectedRows: () => props.data.filter(row => isRowSelected(row)),
});
</script>
```

---

## 5. Database Schema for Table Definitions

Store table definitions in the database for runtime configuration.

### Prisma Schema

```prisma
// prisma/schema.prisma

/// Table schema definitions for dynamic tables
model TableSchema {
  id          String   @id @default(uuid())
  name        String   @unique  // e.g., 'wires'
  displayName String   @map("display_name")
  tableName   String   @map("table_name")  // Actual DB table
  primaryKey  String   @default("id") @map("primary_key")
  columns     Json     // ColumnDefinition[]
  config      Json?    // TableConfig (audit, softDelete, etc.)
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  commands TableCommand[]

  @@map("table_schemas")
}

/// Command definitions for tables
model TableCommand {
  id            String      @id @default(uuid())
  tableSchemaId String?     @map("table_schema_id")  // NULL = global command
  tableSchema   TableSchema? @relation(fields: [tableSchemaId], references: [id])
  name          String
  aliases       String[]
  description   String
  syntax        String
  parameters    Json        // CommandParameter[]
  handlerType   String      @map("handler_type")  // 'builtin' | 'custom'
  handlerCode   String?     @map("handler_code")  // For custom handlers
  isActive      Boolean     @default(true) @map("is_active")
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  @@unique([tableSchemaId, name])
  @@map("table_commands")
}
```

### SQL Migration

```sql
-- migrations/V10__create_table_schemas.sql

CREATE TABLE table_schemas (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    primary_key VARCHAR(100) DEFAULT 'id',
    columns JSONB NOT NULL,
    config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE table_commands (
    id VARCHAR(36) PRIMARY KEY,
    table_schema_id VARCHAR(36) REFERENCES table_schemas(id),
    name VARCHAR(100) NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    description TEXT NOT NULL,
    syntax VARCHAR(200) NOT NULL,
    parameters JSONB NOT NULL,
    handler_type VARCHAR(50) DEFAULT 'builtin',
    handler_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(table_schema_id, name)
);

-- Index for faster lookups
CREATE INDEX idx_table_schemas_active ON table_schemas(is_active);
CREATE INDEX idx_table_commands_schema ON table_commands(table_schema_id);
```

---

## Implementation Roadmap

| Phase | Task | Complexity | Priority |
|-------|------|------------|----------|
| **1** | Create type definitions for schema, search, commands | Low | High |
| **2** | Build `GenericQueryService` with dynamic where clause builder | Medium | High |
| **3** | Implement `CommandRegistry` with plugin architecture | Medium | High |
| **4** | Create generic Vue table component with column type handlers | Medium | Medium |
| **5** | Add database tables for schema storage | Low | Medium |
| **6** | Build admin UI for schema management | High | Low |
| **7** | Migrate existing "wires" table to new generic system | Medium | Medium |

### Recommended Order

1. **Start with types** (`schema.types.ts`, `search.types.ts`, `command.types.ts`)
2. **Implement CommandRegistry** (easiest to test, immediate value)
3. **Build GenericQueryService** (core backend functionality)
4. **Create GenericDataTable.vue** (frontend unification)
5. **Add schema storage** (enables runtime configuration)
6. **Build admin UI** (nice to have)

---

## Quick Win: Minimal Refactor

If you want to start small without a full rewrite, here's the minimal change to make commands extensible:

### Enhanced command-parser.ts

```typescript
// command-parser.ts - Extensible version

export interface ParsedCommand {
  commandName: string;
  arguments: string[];
}

export type CommandHandler = (command: ParsedCommand) => CommandResult;

// Registry of command handlers
const COMMAND_HANDLERS = new Map<string, CommandHandler>();

/**
 * Register a new command handler
 */
export function registerCommand(name: string, handler: CommandHandler): void {
  COMMAND_HANDLERS.set(name.toLowerCase(), handler);
}

/**
 * Register command aliases
 */
export function registerAlias(alias: string, commandName: string): void {
  const handler = COMMAND_HANDLERS.get(commandName.toLowerCase());
  if (handler) {
    COMMAND_HANDLERS.set(alias.toLowerCase(), handler);
  }
}

/**
 * Check if a query is a command
 */
export function isCommand(query: string | undefined | null): boolean {
  return query != null && query.trim().startsWith('/');
}

/**
 * Parse a command string
 */
export function parseCommand(commandString: string): ParsedCommand | null {
  if (!isCommand(commandString)) return null;

  const parts = commandString.substring(1).trim().split(/\s+/);
  if (parts.length === 0 || parts[0] === '') return null;

  return {
    commandName: parts[0].toLowerCase(),
    arguments: parts.slice(1),
  };
}

/**
 * Execute a command and return search criteria
 */
export function executeCommand(keyword: string): CommandResult {
  const command = parseCommand(keyword);
  if (!command) return null;

  const handler = COMMAND_HANDLERS.get(command.commandName);
  return handler ? handler(command) : null;
}

/**
 * Get list of all registered commands
 */
export function getRegisteredCommands(): string[] {
  return [...new Set(COMMAND_HANDLERS.keys())];
}

// ============================================
// Built-in Commands
// ============================================

// Address command
registerCommand('address', (cmd) => ({
  type: 'address',
  sub: cmd.arguments[0] !== undefined ? parseInt(cmd.arguments[0], 10) : undefined,
  word: cmd.arguments[1] !== undefined ? parseInt(cmd.arguments[1], 10) : undefined,
  bits: cmd.arguments[2] !== undefined ? parseInt(cmd.arguments[2], 10) : undefined,
}));
registerAlias('addr', 'address');
registerAlias('a', 'address');

// Range command
registerCommand('range', (cmd) => ({
  type: 'range',
  prefix: cmd.arguments[0] || '',
}));
registerAlias('r', 'range');

// Export types
export type AddressCommandResult = {
  type: 'address';
  sub?: number;
  word?: number;
  bits?: number;
};

export type RangeCommandResult = {
  type: 'range';
  prefix: string;
};

export type CommandResult = AddressCommandResult | RangeCommandResult | null;
```

This minimal change lets you:
- Add new commands with `registerCommand()`
- Add aliases with `registerAlias()`
- Keep backward compatibility with existing code

---

## Summary

This architecture transforms your app from a single-purpose wire management tool into a **flexible data platform** that can:

✅ Define any table structure through configuration
✅ Create complex search queries dynamically  
✅ Add new commands without code changes
✅ Support multiple data domains (wires, equipment, logs, etc.)
✅ Enable runtime schema modifications (with admin UI)

The key principles are:
- **Configuration over code** - Table definitions drive behavior
- **Plugin architecture** - Commands can be registered dynamically
- **Type safety** - Full TypeScript support throughout
- **Backward compatibility** - Existing wires functionality continues to work

