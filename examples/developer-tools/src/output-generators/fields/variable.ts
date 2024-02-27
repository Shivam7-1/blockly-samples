/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {
  JsonDefinitionGenerator,
  jsonDefinitionGenerator,
} from '../json_definition_generator';
import {
  JavascriptDefinitionGenerator,
  javascriptDefinitionGenerator,
} from '../javascript_definition_generator';

jsonDefinitionGenerator.forBlock['field_variable'] = function (
  block: Blockly.Block,
  generator: JsonDefinitionGenerator,
): string {
  const code = {
    type: 'field_variable',
    name: block.getFieldValue('FIELDNAME'),
    variable: block.getFieldValue('TEXT'),
  };
  return JSON.stringify(code);
};

javascriptDefinitionGenerator.forBlock['field_variable'] = function (
  block: Blockly.Block,
  generator: JavascriptDefinitionGenerator,
): string {
  const name = generator.quote_(block.getFieldValue('FIELDNAME'));
  const variable = generator.quote_(block.getFieldValue('TEXT'));

  const code = `.appendField(new Blockly.FieldVariable(${variable}), ${name})`;
  return code;
};