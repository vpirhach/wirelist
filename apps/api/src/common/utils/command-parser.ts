/**
 * Simple utility class for parsing search commands.
 * Commands start with '/' followed by command name and optional arguments.
 * Example: /address 1 2 3
 */

export interface ParsedCommand {
  commandName: string;
  arguments: string[];
}

/**
 * Checks if a search query is a command (starts with '/').
 */
export function isCommand(query: string | undefined | null): boolean {
  return query != null && query.trim().startsWith('/');
}

/**
 * Parses a command string into a ParsedCommand object.
 * Returns null if the string is not a valid command.
 */
export function parseCommand(commandString: string): ParsedCommand | null {
  if (!isCommand(commandString)) {
    return null;
  }

  try {
    // Remove the leading '/' and split by whitespace
    const parts = commandString.substring(1).trim().split(/\s+/);

    if (parts.length === 0 || parts[0] === '') {
      return null;
    }

    const commandName = parts[0].toLowerCase();
    const args = parts.length > 1 ? parts.slice(1) : [];

    return {
      commandName,
      arguments: args,
    };
  } catch {
    return null;
  }
}

/**
 * Get argument at index, or undefined if not present
 */
export function getArgument(command: ParsedCommand, index: number): string | undefined {
  return index < command.arguments.length ? command.arguments[index] : undefined;
}

/**
 * Get argument as number (byte-like), or undefined if not valid
 */
export function getNumberArgument(command: ParsedCommand, index: number): number | undefined {
  const arg = getArgument(command, index);
  if (arg === undefined) {
    return undefined;
  }

  const num = parseInt(arg, 10);
  return isNaN(num) ? undefined : num;
}

/**
 * Supported commands and their handlers
 */
export type AddressCommandResult = {
  type: 'address';
  sub?: number;
  word?: number;
  bits?: number;
};

export type CommandResult = AddressCommandResult | null;

/**
 * Parse and execute a command, returning the appropriate search criteria
 */
export function executeCommand(keyword: string): CommandResult {
  const command = parseCommand(keyword);
  if (!command) {
    return null;
  }

  switch (command.commandName) {
    case 'address':
      return {
        type: 'address',
        sub: getNumberArgument(command, 0),
        word: getNumberArgument(command, 1),
        bits: getNumberArgument(command, 2),
      };

    // Future commands can be added here:
    // case 'range':
    //   return { type: 'range', ... };

    default:
      return null;
  }
}

