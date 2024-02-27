/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {javascriptGenerator, Order as JsOrder} from 'blockly/javascript';
import {
  JsonDefinitionGenerator,
  jsonDefinitionGenerator,
  Order as JsonOrder,
} from './json_definition_generator';
import {
  JavascriptDefinitionGenerator,
  javascriptDefinitionGenerator,
} from './javascript_definition_generator';

/**
 * Builds the 'message0' part of the JSON block definition.
 * The message should have label fields' text inlined into the message.
 * Doing so makes the message more translatable as fields can be moved around.
 *
 * @param argsList The list of fields and inputs generated from the input stack.
 * @returns An object containing:
 *    - a message string with one placeholder '%i`
 *      for each field and input in the block
 *    - the new args list, with label fields removed
 */
const buildMessageString = function (argsList: Array<Record<string, unknown>>) {
  let i = 0;
  let messageString = '';
  const newArgs = [];
  for (const arg of argsList) {
    if (arg.type === 'field_label') {
      // Label fields get added directly to the message string.
      // They are removed from the arg list so they don't appear twice.
      messageString += `${arg.text} `;
    } else {
      i++;
      messageString += `%${i} `;
      newArgs.push(arg);
    }
  }

  return {
    message: messageString.trim(),
    args: newArgs,
  };
};

jsonDefinitionGenerator.forBlock['factory_base'] = function (
  block: Blockly.Block,
  generator: JsonDefinitionGenerator,
): string {
  // TODO: Get a JSON-legal name for the block
  const blockName = block.getFieldValue('NAME');
  // Tooltip and Helpurl string blocks can't be removed, so we don't care what happens if the block doesn't exist
  const tooltip = JSON.parse(
    generator.valueToCode(block, 'TOOLTIP', JsonOrder.ATOMIC),
  );
  const helpUrl = JSON.parse(
    generator.valueToCode(block, 'HELPURL', JsonOrder.ATOMIC),
  );

  const code: {[key: string]: unknown} = {
    type: blockName,
    tooltip: tooltip,
    helpUrl: helpUrl,
  };

  const inputsStack = generator.statementToCode(block, 'INPUTS');
  if (inputsStack) {
    // If there is a stack, they come back as the inner pieces of an array
    // Can possibly fix this in scrub?
    const args0 = JSON.parse(`[${inputsStack}]`);
    const {args, message} = buildMessageString(args0);
    code.message0 = message;
    code.args0 = args;
  } else {
    code.message0 = '';
  }

  /**
   * Sets the connection check for the given input, if present. If the input exists
   * but doesn't have a block attached or a value, the connection property is
   * still added to the output with a check of 'null'. If the input doesn't
   * exist, that means the block should not have that type of connection, and no
   * property is added to the output.
   *
   * @param inputName The name of the input that would contain the type check.
   * @param connectionName The name of the connection in the definition output.
   */
  const setConnectionChecks = (inputName: string, connectionName: string) => {
    if (this.getInput(inputName)) {
      // If there is no set type, we still need to add 'null' to the check
      const output = generator.valueToCode(block, inputName, JsonOrder.ATOMIC);
      code[connectionName] = output ? JSON.parse(output) : null;
    }
  };

  setConnectionChecks('OUTPUTCHECK', 'output');
  setConnectionChecks('TOPCHECK', 'previousStatement');
  setConnectionChecks('BOTTOMCHECK', 'nextStatement');

  const colour = generator.valueToCode(block, 'COLOUR', JsonOrder.ATOMIC);
  if (colour !== '') {
    code.colour = JSON.parse(colour);
  }

  const inputsAlign = block.getFieldValue('INLINE');
  switch (inputsAlign) {
    case 'EXT': {
      code.inputsInline = false;
      break;
    }
    case 'INT': {
      code.inputsInline = true;
      break;
    }
    default: {
      // Don't add anything for "auto".
    }
  }

  return JSON.stringify(code, undefined, 2);
};

jsonDefinitionGenerator.forBlock['text'] = javascriptGenerator.forBlock['text'];

javascriptDefinitionGenerator.forBlock['factory_base'] = function (
  block: Blockly.Block,
  generator: JavascriptDefinitionGenerator,
) {
  // TODO: Get a JavaScript-legal name for the block
  const blockName = block.getFieldValue('NAME');
  const inputsValue = generator.statementToCode(block, 'INPUTS');
  const inputs = inputsValue
    ? generator.prefixLines(inputsValue, generator.INDENT) + '\n'
    : '';

  const alignInputsValue = block.getFieldValue('INLINE');
  let alignInputs = '';
  if (alignInputsValue === 'EXT') {
    alignInputs = 'this.setInputsInline(false)';
  } else if (alignInputsValue === 'INT') {
    alignInputs = 'this.setInputsInline(true)';
  }

  const createConnectionChecks = function (
    inputName: string,
    connectionName: string,
  ): string {
    if (block.getInput(inputName)) {
      const check = generator.valueToCode(
        block,
        inputName,
        JsOrder.FUNCTION_CALL,
      );
      return `this.set${connectionName}(true, ${check});`;
    }
    return '';
  };
  const connectionsList = [];
  connectionsList.push(createConnectionChecks('OUTPUTCHECK', 'Output'));
  connectionsList.push(createConnectionChecks('TOPCHECK', 'PreviousStatement'));
  connectionsList.push(createConnectionChecks('BOTTOMCHECK', 'NextStatement'));
  const connections = connectionsList
    .filter((value) => value !== '')
    .join('\n');

  const tooltip = `this.setTooltip(${
    generator.valueToCode(block, 'TOOLTIP', JsOrder.ATOMIC) || "''"
  });`;
  const helpUrl = `this.setHelpUrl(${
    generator.valueToCode(block, 'HELPURL', JsOrder.ATOMIC) || "''"
  });`;

  const colourValue = generator.valueToCode(block, 'COLOUR', JsOrder.ATOMIC);
  const colour = colourValue !== '' ? `this.setColour(${colourValue});` : '';

  // Filter out empty code string pieces, join them all with newlines, and indent them twice.
  // Inputs code is already indented once automatically by the generator
  // since it's in a statement input, so it's not included here.
  const codeStringPieces = generator.prefixLines(
    [alignInputs, connections, tooltip, helpUrl, colour]
      .filter((value) => value !== '')
      .join('\n'),
    generator.INDENT + generator.INDENT,
  );
  const code = `const ${blockName} = {
  init: function() {
${inputs}${codeStringPieces}
  }
};
Blockly.common.defineBlocks({${blockName}: ${blockName}});`;
  return code;
};

javascriptDefinitionGenerator.forBlock['text'] =
  javascriptGenerator.forBlock['text'];