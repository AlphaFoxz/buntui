import {createDomainDesigner} from '@ddd-tool/domain-designer-core';

const d = createDomainDesigner();
const i = d.info;

const 创建场景成功事件 = d.event('SceneCreated', ['sceneId', 'visible', 'bgColor']);
const 切换场景成功事件 = d.event('SceneSwitched', ['sceneId']);
const 创建组件成功事件 = d.event('WidgetCreated', ['widgetId', 'x', 'y', 'width', 'height']);
const 删除组件成功事件 = d.event('WidgetDeleted', ['widgetId']);
const 当前帧已生成事件 = d.event('CurrentFrameRendered', [
  'x',
  'y',
  'fgColor',
  'bgColor',
  'char',
  'charType',
]);
const 当前帧已渲染事件 = d.event('CurrentFrameRendered', [
  'x',
  'y',
  'fgColor',
  'bgColor',
  'char',
  'charType',
]);

const 场景聚合 = d.agg('SceneAgg', ['sceneId', 'visible', 'bgColor', 'widgets']);
const 组件聚合 = d.agg('WidgetAgg', [
  'widgetId',
  'x',
  'y',
  'width',
  'height',
  'zIndex',
  'visible',
  'text',
]);

const 创建场景命令 = d.command('CreateSceneCommand', ['visible', 'bgColor']);
const 切换场景命令 = d.command('SwitchSceneCommand', ['sceneId']);
const 创建组件命令 = d.command('CreateWidgetCommand', [
  'x',
  'y',
  'width',
  'height',
  'zIndex',
  'visible',
  'text',
]);
const 删除组件命令 = d.command('DeleteWidgetCommand', ['widgetId']);
const 渲染命令 = d.command('RenderCommand', ['组件列表']);

const 初始化工作流 = d.startWorkflow('初始化工作流');
创建场景命令.agg(场景聚合).event(创建场景成功事件);
切换场景命令.agg(场景聚合).event(切换场景成功事件);
创建组件命令.agg(组件聚合).event(创建组件成功事件);
删除组件命令.agg(组件聚合).event(删除组件成功事件);

const 渲染工作流 = d.startWorkflow('渲染工作流');
渲染命令.agg(组件聚合).event(当前帧已生成事件);
渲染命令.agg(组件聚合).event(当前帧已渲染事件);

d.defineUserStory('用户创建UI', [初始化工作流, 渲染工作流]);

export default d;
