import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  API,
  isMobile,
  showError,
  showInfo,
  showSuccess,
  verifyJSON,
} from '../../helpers';
import { CHANNEL_OPTIONS } from '../../constants';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import {
  SideSheet,
  Space,
  Spin,
  Button,
  Tooltip,
  Input,
  Typography,
  Select,
  TextArea,
  Checkbox,
  Banner,
} from '@douyinfe/semi-ui';
import { Divider } from 'semantic-ui-react';
import { getChannelModels, loadChannelModels } from '../../components/utils.js';
import axios from 'axios';

const MODEL_MAPPING_EXAMPLE = {
  'gpt-3.5-turbo-0301': 'gpt-3.5-turbo',
  'gpt-4-0314': 'gpt-4',
  'gpt-4-32k-0314': 'gpt-4-32k',
};

const STATUS_CODE_MAPPING_EXAMPLE = {
  400: '500',
};

const REGION_EXAMPLE = {
  "default": "us-central1",
  "claude-3-5-sonnet-20240620": "europe-west1"
}

const fetchButtonTips = "1. 新建Channel时，请求通过当前浏览器发出；2. Edit已有Channel，请求通过后端服务器发出"

function type2secretPrompt(type) {
  // inputs.type === 15 ? 'Enter in the following format:APIKey|SecretKey' : (inputs.type === 18 ? 'Enter in the following format:APPID|APISecret|APIKey' : 'Please enter the authentication key corresponding to the channel')
  switch (type) {
    case 15:
      return 'Enter in the following format:APIKey|SecretKey';
    case 18:
      return 'Enter in the following format:APPID|APISecret|APIKey';
    case 22:
      return 'Enter in the following format:APIKey-AppId，For example：fastgpt-0sp2gtvfdgyi4k30jwlgwf1i-64f335d84283f05518e9e041';
    case 23:
      return 'Enter in the following format:AppId|SecretId|SecretKey';
    case 33:
      return 'Enter in the following format:Ak|Sk|Region';
    default:
      return 'Please enter the authentication key corresponding to the channel';
  }
}

const EditChannel = (props) => {
  const navigate = useNavigate();
  const channelId = props.editingChannel.id;
  const isEdit = channelId !== undefined;
  const [loading, setLoading] = useState(isEdit);
  const handleCancel = () => {
    props.handleClose();
  };
  const originInputs = {
    name: '',
    type: 1,
    key: '',
    openai_organization: '',
    max_input_tokens: 0,
    base_url: '',
    other: '',
    model_mapping: '',
    status_code_mapping: '',
    models: [],
    auto_ban: 1,
    test_model: '',
    groups: ['default'],
  };
  const [batch, setBatch] = useState(false);
  const [autoBan, setAutoBan] = useState(true);
  // const [autoBan, setAutoBan] = useState(true);
  const [inputs, setInputs] = useState(originInputs);
  const [originModelOptions, setOriginModelOptions] = useState([]);
  const [modelOptions, setModelOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [basicModels, setBasicModels] = useState([]);
  const [fullModels, setFullModels] = useState([]);
  const [customModel, setCustomModel] = useState('');
  const handleInputChange = (name, value) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
    if (name === 'type') {
      let localModels = [];
      switch (value) {
        case 2:
          localModels = [
            'mj_imagine',
            'mj_variation',
            'mj_reroll',
            'mj_blend',
            'mj_upscale',
            'mj_describe',
            'mj_uploads',
          ];
          break;
        case 5:
          localModels = [
            'swap_face',
            'mj_imagine',
            'mj_variation',
            'mj_reroll',
            'mj_blend',
            'mj_upscale',
            'mj_describe',
            'mj_zoom',
            'mj_shorten',
            'mj_modal',
            'mj_inpaint',
            'mj_custom_zoom',
            'mj_high_variation',
            'mj_low_variation',
            'mj_pan',
            'mj_uploads',
          ];
          break;
        case 36:
          localModels = [
            'suno_music',
            'suno_lyrics',
          ];
          break;
        default:
          localModels = getChannelModels(value);
          break;
      }
      if (inputs.models.length === 0) {
        setInputs((inputs) => ({ ...inputs, models: localModels }));
      }
      setBasicModels(localModels);
    }
    //setAutoBan
  };

  const loadChannel = async () => {
    setLoading(true);
    let res = await API.get(`/api/channel/${channelId}`);
    if (res === undefined) {
      return;
    }
    const { success, message, data } = res.data;
    if (success) {
      if (data.models === '') {
        data.models = [];
      } else {
        data.models = data.models.split(',');
      }
      if (data.group === '') {
        data.groups = [];
      } else {
        data.groups = data.group.split(',');
      }
      if (data.model_mapping !== '') {
        data.model_mapping = JSON.stringify(
          JSON.parse(data.model_mapping),
          null,
          2,
        );
      }
      setInputs(data);
      if (data.auto_ban === 0) {
        setAutoBan(false);
      } else {
        setAutoBan(true);
      }
      setBasicModels(getChannelModels(data.type));
      // console.log(data);
    } else {
      showError(message);
    }
    setLoading(false);
  };


  const fetchUpstreamModelList = async (name) => {
    if (inputs["type"] !== 1) {
      showError("仅 support  OpenAI 接口格式")
      return;
    }
    setLoading(true)
    const models = inputs["models"] || []
    let err = false;
    if (isEdit) {
      const res = await API.get("/api/channel/fetch_models/" + channelId)
      if (res.data && res.data?.success) {
        models.push(...res.data.data)
      } else {
        err = true
      }
    } else {
      if (!inputs?.["key"]) {
        showError("Please fill in the key")
        err = true
      } else {
        try {
          const host = new URL((inputs["base_url"] || "https://api.openai.com"))

          const url = `https://${host.hostname}/v1/models`;
          const key = inputs["key"];
          const res = await axios.get(url, {
            headers: {
              'Authorization': `Bearer ${key}`
            }
          })
          if (res.data && res.data?.success) {
            models.push(...res.data.data.map((model) => model.id))
          } else {
            err = true
          }
        }
        catch (error) {
          err = true
        }
      }
    }
    if (!err) {
      handleInputChange(name, Array.from(new Set(models)));
      showSuccess("Successfully retrieved model list");
    } else {
      showError('Failed to retrieve model list');
    }
    setLoading(false);
  }

  const fetchModels = async () => {
    try {
      let res = await API.get(`/api/channel/models`);
      let localModelOptions = res.data.data.map((model) => ({
        label: model.id,
        value: model.id,
      }));
      setOriginModelOptions(localModelOptions);
      setFullModels(res.data.data.map((model) => model.id));
      setBasicModels(
        res.data.data
          .filter((model) => {
            return model.id.startsWith('gpt-3') || model.id.startsWith('text-');
          })
          .map((model) => model.id),
      );
    } catch (error) {
      showError(error.message);
    }
  };

  const fetchGroups = async () => {
    try {
      let res = await API.get(`/api/group/`);
      if (res === undefined) {
        return;
      }
      setGroupOptions(
        res.data.data.map((group) => ({
          label: group,
          value: group,
        })),
      );
    } catch (error) {
      showError(error.message);
    }
  };

  useEffect(() => {
    let localModelOptions = [...originModelOptions];
    inputs.models.forEach((model) => {
      if (!localModelOptions.find((option) => option.key === model)) {
        localModelOptions.push({
          label: model,
          value: model,
        });
      }
    });
    setModelOptions(localModelOptions);
  }, [originModelOptions, inputs.models]);

  useEffect(() => {
    fetchModels().then();
    fetchGroups().then();
    if (isEdit) {
      loadChannel().then(() => {});
    } else {
      setInputs(originInputs);
      let localModels = getChannelModels(inputs.type);
      setBasicModels(localModels);
      setInputs((inputs) => ({ ...inputs, models: localModels }));
    }
  }, [props.editingChannel.id]);

  const submit = async () => {
    if (!isEdit && (inputs.name === '' || inputs.key === '')) {
      showInfo('Please fill in the channel name and channel secret!');
      return;
    }
    if (inputs.models.length === 0) {
      showInfo('Please select at least one model!');
      return;
    }
    if (inputs.model_mapping !== '' && !verifyJSON(inputs.model_mapping)) {
      showInfo('Model mapping must be in valid JSON format!');
      return;
    }
    let localInputs = { ...inputs };
    if (localInputs.base_url && localInputs.base_url.endsWith('/')) {
      localInputs.base_url = localInputs.base_url.slice(
        0,
        localInputs.base_url.length - 1,
      );
    }
    if (localInputs.type === 3 && localInputs.other === '') {
      localInputs.other = '2023-06-01-preview';
    }
    if (localInputs.type === 18 && localInputs.other === '') {
      localInputs.other = 'v2.1';
    }
    let res;
    if (!Array.isArray(localInputs.models)) {
      showError('SubmitFailure，请勿Duplicate Submission！');
      handleCancel();
      return;
    }
    localInputs.auto_ban = autoBan ? 1 : 0;
    localInputs.models = localInputs.models.join(',');
    localInputs.group = localInputs.groups.join(',');
    if (isEdit) {
      res = await API.put(`/api/channel/`, {
        ...localInputs,
        id: parseInt(channelId),
      });
    } else {
      res = await API.post(`/api/channel/`, localInputs);
    }
    const { success, message } = res.data;
    if (success) {
      if (isEdit) {
        showSuccess('Channel updated successfully!');
      } else {
        showSuccess('Channel created successfully!');
        setInputs(originInputs);
      }
      props.refresh();
      props.handleClose();
    } else {
      showError(message);
    }
  };

  const addCustomModels = () => {
    if (customModel.trim() === '') return;
    // 使用逗号分隔字符串，然后去除每  Model Name前后的空格
    const modelArray = customModel.split(',').map((model) => model.trim());

    let localModels = [...inputs.models];
    let localModelOptions = [...modelOptions];
    let hasError = false;

    modelArray.forEach((model) => {
      // 检查Model是否已存在，且Model Name非空
      if (model && !localModels.includes(model)) {
        localModels.push(model); // 添加到Model列表
        localModelOptions.push({
          // 添加到下拉选项
          key: model,
          text: model,
          value: model,
        });
      } else if (model) {
        showError('某些Model已存在！');
        hasError = true;
      }
    });

    if (hasError) return; // 如果有错误则终止Operation

    // 更新Status值
    setModelOptions(localModelOptions);
    setCustomModel('');
    handleInputChange('models', localModels);
  };


  return (
    <>
      <SideSheet
        maskClosable={false}
        placement={isEdit ? 'right' : 'left'}
        title={
          <Title level={3}>{isEdit ? 'Update Channel Information' : 'Create New Channel'}</Title>
        }
        headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
        bodyStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
        visible={props.visible}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Space>
              <Button theme='solid' size={'large'} onClick={submit}>
                Submit
              </Button>
              <Button
                theme='solid'
                size={'large'}
                type={'tertiary'}
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </Space>
          </div>
        }
        closeIcon={null}
        onCancel={() => handleCancel()}
        width={isMobile() ? '100%' : 600}
      >
        <Spin spinning={loading}>
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong>Type：</Typography.Text>
          </div>
          <Select
            name='type'
            required
            optionList={CHANNEL_OPTIONS}
            value={inputs.type}
            onChange={(value) => handleInputChange('type', value)}
            style={{ width: '50%' }}
          />
          {inputs.type === 3 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Banner
                  type={'warning'}
                  description={
                    <>
                      Note that, <strong>The model deployment name must be consistent with the model name</strong>
                      , because One API will take the model in the request body
                      Replace the parameter with your deployment name (dots in the model name will be removed)，
                      <a
                        target='_blank'
                        href='#/issues/133?notification_referrer_id=NT_kwDOAmJSYrM2NjIwMzI3NDgyOjM5OTk4MDUw#issuecomment-1571602271'
                      >
                        Image demo
                      </a>
                      。
                    </>
                  }
                ></Banner>
              </div>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>
                  AZURE_OPENAI_ENDPOINT：
                </Typography.Text>
              </div>
              <Input
                label='AZURE_OPENAI_ENDPOINT'
                name='azure_base_url'
                placeholder={
                  'Please enter AZURE_OPENAI_ENDPOINT，For example：https://docs-test-001.openai.azure.com'
                }
                onChange={(value) => {
                  handleInputChange('base_url', value);
                }}
                value={inputs.base_url}
                autoComplete='new-password'
              />
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>Default API Version：</Typography.Text>
              </div>
              <Input
                label='Default API Version'
                name='azure_other'
                placeholder={
                  'Please enterDefault API Version，For example：2023-06-01-preview，该 Configuration 可以被实际的请求Query参数所覆盖'
                }
                onChange={(value) => {
                  handleInputChange('other', value);
                }}
                value={inputs.other}
                autoComplete='new-password'
              />
            </>
          )}
          {inputs.type === 8 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Banner
                  type={'warning'}
                  description={
                    <>
                      如果你对接的是上游One API或者New API等转发项目，请使用OpenAIType，不要使用此Type，除非你知道你在做什么。
                    </>
                  }
                ></Banner>
              </div>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>
                  完整的 Base URL， support 变量{'{model}'}：
                </Typography.Text>
              </div>
              <Input
                name='base_url'
                placeholder={
                  'Please enter完整的URL，For example：https://api.openai.com/v1/chat/completions'
                }
                onChange={(value) => {
                  handleInputChange('base_url', value);
                }}
                value={inputs.base_url}
                autoComplete='new-password'
              />
            </>
          )}
          {inputs.type === 36 && (
              <>
                <div style={{marginTop: 10}}>
                  <Typography.Text strong>
                    Note非Chat API，请务必填写正确的API地址，否则可能导致None法使用
                  </Typography.Text>
                </div>
                <Input
                    name='base_url'
                    placeholder={
                      'Please enter到 /suno 前的路径，通常就是域名，For example：https://api.example.com '
                    }
                    onChange={(value) => {
                      handleInputChange('base_url', value);
                    }}
                    value={inputs.base_url}
                    autoComplete='new-password'
                />
              </>
          )}
          <div style={{marginTop: 10}}>
            <Typography.Text strong>Name：</Typography.Text>
          </div>
          <Input
              required
              name='name'
            placeholder={'Please name the channel'}
            onChange={(value) => {
              handleInputChange('name', value);
            }}
            value={inputs.name}
            autoComplete='new-password'
          />
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong>Group：</Typography.Text>
          </div>
          <Select
            placeholder={'Please select a group that can use this channel'}
            name='groups'
            required
            multiple
            selection
            allowAdditions
            additionLabel={'Please edit the group ratio in the system settings page to add a new group:'}
            onChange={(value) => {
              handleInputChange('groups', value);
            }}
            value={inputs.groups}
            autoComplete='new-password'
            optionList={groupOptions}
          />
          {inputs.type === 18 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>Model version：</Typography.Text>
              </div>
              <Input
                name='other'
                placeholder={
                  'Please enter the version of the Starfire model, note that it is the version number in the interface address, for example: v2.1'
                }
                onChange={(value) => {
                  handleInputChange('other', value);
                }}
                value={inputs.other}
                autoComplete='new-password'
              />
            </>
          )}
          {inputs.type === 41 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>部署地区：</Typography.Text>
              </div>
              <TextArea
                name='other'
                placeholder={
                  'Please enter部署地区，For example：us-central1\n support 使用Model mapping格式\n' +
                  '{\n' +
                  '    "default": "us-central1",\n' +
                  '    "claude-3-5-sonnet-20240620": "europe-west1"\n' +
                  '}'
                }
                autosize={{ minRows: 2 }}
                onChange={(value) => {
                  handleInputChange('other', value);
                }}
                value={inputs.other}
                autoComplete='new-password'
              />
              <Typography.Text
                style={{
                  color: 'rgba(var(--semi-blue-5), 1)',
                  userSelect: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  handleInputChange(
                    'other',
                    JSON.stringify(REGION_EXAMPLE, null, 2),
                  );
                }}
              >
                填入模板
              </Typography.Text>
            </>
          )}
          {inputs.type === 21 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>知识库 ID：</Typography.Text>
              </div>
              <Input
                label='知识库 ID'
                name='other'
                placeholder={'Please enter知识库 ID，For example：123456'}
                onChange={(value) => {
                  handleInputChange('other', value);
                }}
                value={inputs.other}
                autoComplete='new-password'
              />
            </>
          )}
          {inputs.type === 39 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>Account ID：</Typography.Text>
              </div>
              <Input
                name='other'
                placeholder={
                  'Please enterAccount ID，For example：d6b5da8hk1awo8nap34ube6gh'
                }
                onChange={(value) => {
                  handleInputChange('other', value);
                }}
                value={inputs.other}
                autoComplete='new-password'
              />
            </>
          )}
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong>Model：</Typography.Text>
          </div>
          <Select
            placeholder={'请 Select 该Channel所 support 的Model'}
            name='models'
            required
            multiple
            selection
            onChange={(value) => {
              handleInputChange('models', value);
            }}
            value={inputs.models}
            autoComplete='new-password'
            optionList={modelOptions}
          />
          <div style={{ lineHeight: '40px', marginBottom: '12px' }}>
            <Space>
              <Button
                type='primary'
                onClick={() => {
                  handleInputChange('models', basicModels);
                }}
              >
                填入相 off Model
              </Button>
              <Button
                type='secondary'
                onClick={() => {
                  handleInputChange('models', fullModels);
                }}
              >
                Fill in all models
              </Button>
              <Tooltip content={fetchButtonTips}>
                <Button
                  type='tertiary'
                  onClick={() => {
                    fetchUpstreamModelList('models');
                  }}
                >
                  获取Model列表
                </Button>
              </Tooltip>
              <Button
                type='warning'
                onClick={() => {
                  handleInputChange('models', []);
                }}
              >
                Clear all models
              </Button>
            </Space>
            <Input
              addonAfter={
                <Button type='primary' onClick={addCustomModels}>
                  填入
                </Button>
              }
              placeholder='EnterCustomModel Name'
              value={customModel}
              onChange={(value) => {
                setCustomModel(value.trim());
              }}
            />
          </div>
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong>Model redirection：</Typography.Text>
          </div>
          <TextArea
            placeholder={`This is optional, used to modify the model name in the request body, it's a JSON string, the key is the model name in the request, and the value is the model name to be replaced, for example:\n${JSON.stringify(MODEL_MAPPING_EXAMPLE, null, 2)}`}
            name='model_mapping'
            onChange={(value) => {
              handleInputChange('model_mapping', value);
            }}
            autosize
            value={inputs.model_mapping}
            autoComplete='new-password'
          />
          <Typography.Text
            style={{
              color: 'rgba(var(--semi-blue-5), 1)',
              userSelect: 'none',
              cursor: 'pointer',
            }}
            onClick={() => {
              handleInputChange(
                'model_mapping',
                JSON.stringify(MODEL_MAPPING_EXAMPLE, null, 2),
              );
            }}
          >
            填入模板
          </Typography.Text>
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong>Key：</Typography.Text>
          </div>
          {batch ? (
            <TextArea
              label='Key'
              name='key'
              required
              placeholder={'Please enter the key, one per line'}
              onChange={(value) => {
                handleInputChange('key', value);
              }}
              value={inputs.key}
              style={{ minHeight: 150, fontFamily: 'JetBrains Mono, Consolas' }}
              autoComplete='new-password'
            />
          ) : (
            <>
              {inputs.type === 41 ? (
                <TextArea
                  label='鉴权json'
                  name='key'
                  required
                  placeholder={'{\n' +
                    '  "type": "service_account",\n' +
                    '  "project_id": "abc-bcd-123-456",\n' +
                    '  "private_key_id": "123xxxxx456",\n' +
                    '  "private_key": "-----BEGIN PRIVATE KEY-----xxxx\n' +
                    '  "client_email": "xxx@developer.gserviceaccount.com",\n' +
                    '  "client_id": "111222333",\n' +
                    '  "auth_uri": "https://accounts.google.com/o/oauth2/auth",\n' +
                    '  "token_uri": "https://oauth2.googleapis.com/token",\n' +
                    '  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",\n' +
                    '  "client_x509_cert_url": "https://xxxxx.gserviceaccount.com",\n' +
                    '  "universe_domain": "googleapis.com"\n' +
                    '}'}
                  onChange={(value) => {
                    handleInputChange('key', value);
                  }}
                  autosize={{ minRows: 10 }}
                  value={inputs.key}
                  autoComplete='new-password'
                />
              ) : (
                <Input
                  label='Key'
                  name='key'
                  required
                  placeholder={type2secretPrompt(inputs.type)}
                  onChange={(value) => {
                    handleInputChange('key', value);
                  }}
                  value={inputs.key}
                  autoComplete='new-password'
                />
              )
              }
              </>
          )}
          {inputs.type === 1 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>组织：</Typography.Text>
              </div>
              <Input
                label='组织，可选，不填则 for Default组织'
                name='openai_organization'
                placeholder='Please enter组织org-xxx'
                onChange={(value) => {
                  handleInputChange('openai_organization', value);
                }}
                value={inputs.openai_organization}
              />
            </>
          )}
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong>DefaultTestModel：</Typography.Text>
          </div>
          <Input
            name='test_model'
            placeholder='不填则 for Model列表 No. 一  '
            onChange={(value) => {
              handleInputChange('test_model', value);
            }}
            value={inputs.test_model}
          />
          <div style={{ marginTop: 10, display: 'flex' }}>
            <Space>
              <Checkbox
                name='auto_ban'
                checked={autoBan}
                onChange={() => {
                  setAutoBan(!autoBan);
                }}
                // onChange={handleInputChange}
              />
              <Typography.Text strong>
                是否Automatically Disabled（仅当Automatically Disabled开启时有效），Close后不会Automatically Disabled该Channel：
              </Typography.Text>
            </Space>
          </div>

          {!isEdit && (
            <div style={{ marginTop: 10, display: 'flex' }}>
              <Space>
                <Checkbox
                  checked={batch}
                  label='Batch Create'
                  name='batch'
                  onChange={() => setBatch(!batch)}
                />
                <Typography.Text strong>Batch Create</Typography.Text>
              </Space>
            </div>
          )}
          {inputs.type !== 3 && inputs.type !== 8 && inputs.type !== 22 && inputs.type !== 36 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>Proxy：</Typography.Text>
              </div>
              <Input
                label='Proxy'
                name='base_url'
                placeholder={'此项可选，用于通过Proxy站来进行 API 调用'}
                onChange={(value) => {
                  handleInputChange('base_url', value);
                }}
                value={inputs.base_url}
                autoComplete='new-password'
              />
            </>
          )}
          {inputs.type === 22 && (
            <>
              <div style={{ marginTop: 10 }}>
                <Typography.Text strong>私有部署地址：</Typography.Text>
              </div>
              <Input
                name='base_url'
                placeholder={
                  'Please enter the private deployment address, format: https://fastgpt.run/api/openapi'
                }
                onChange={(value) => {
                  handleInputChange('base_url', value);
                }}
                value={inputs.base_url}
                autoComplete='new-password'
              />
            </>
          )}
          <div style={{ marginTop: 10 }}>
            <Typography.Text strong>
              Status Code Rewrite (only affects local judgment, does not modify the status code returned to upstream)：
            </Typography.Text>
          </div>
          <TextArea
            placeholder={`This is optional, used to rewrite the returned status code, for example, rewriting the 400 error of the Claude channel to 500 (for retries). Please do not misuse this function, for example:\n${JSON.stringify(STATUS_CODE_MAPPING_EXAMPLE, null, 2)}`}
            name='status_code_mapping'
            onChange={(value) => {
              handleInputChange('status_code_mapping', value);
            }}
            autosize
            value={inputs.status_code_mapping}
            autoComplete='new-password'
          />
          <Typography.Text
            style={{
              color: 'rgba(var(--semi-blue-5), 1)',
              userSelect: 'none',
              cursor: 'pointer',
            }}
            onClick={() => {
              handleInputChange(
                'status_code_mapping',
                JSON.stringify(STATUS_CODE_MAPPING_EXAMPLE, null, 2),
              );
            }}
          >
            填入模板
          </Typography.Text>
          {/*<div style={{ marginTop: 10 }}>*/}
          {/*  <Typography.Text strong>*/}
          {/*    Maximum request tokens (0 means no restriction):*/}
          {/*  </Typography.Text>*/}
          {/*</div>*/}
          {/*<Input*/}
          {/*  label='最大请求token'*/}
          {/*  name='max_input_tokens'*/}
          {/*  placeholder='Default for 0，表示不限制'*/}
          {/*  onChange={(value) => {*/}
          {/*    handleInputChange('max_input_tokens', value);*/}
          {/*  }}*/}
          {/*  value={inputs.max_input_tokens}*/}
          {/*/>*/}
        </Spin>
      </SideSheet>
    </>
  );
};

export default EditChannel;
