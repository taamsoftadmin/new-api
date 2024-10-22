import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  API,
  isMobile,
  showError,
  showSuccess,
  timestamp2string,
} from '../../helpers';
import { renderQuotaWithPrompt } from '../../helpers/render';
import {
  AutoComplete,
  Banner,
  Button,
  Checkbox,
  DatePicker,
  Input,
  Select,
  SideSheet,
  Space,
  Spin, TextArea,
  Typography
} from '@douyinfe/semi-ui';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import { Divider } from 'semantic-ui-react';

const EditToken = (props) => {
  const [isEdit, setIsEdit] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const originInputs = {
    name: '',
    remain_quota: isEdit ? 0 : 500000,
    expired_time: -1,
    unlimited_quota: false,
    model_limits_enabled: false,
    model_limits: [],
    allow_ips: '',
    group: '',
  };
  const [inputs, setInputs] = useState(originInputs);
  const {
    name,
    remain_quota,
    expired_time,
    unlimited_quota,
    model_limits_enabled,
    model_limits,
    allow_ips,
    group
  } = inputs;
  // const [visible, setVisible] = useState(false);
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();
  const handleInputChange = (name, value) => {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  };
  const handleCancel = () => {
    props.handleClose();
  };
  const setExpiredTime = (month, day, hour, minute) => {
    let now = new Date();
    let timestamp = now.getTime() / 1000;
    let seconds = month * 30 * 24 * 60 * 60;
    seconds += day * 24 * 60 * 60;
    seconds += hour * 60 * 60;
    seconds += minute * 60;
    if (seconds !== 0) {
      timestamp += seconds;
      setInputs({ ...inputs, expired_time: timestamp2string(timestamp) });
    } else {
      setInputs({ ...inputs, expired_time: -1 });
    }
  };

  const setUnlimitedQuota = () => {
    setInputs({ ...inputs, unlimited_quota: !unlimited_quota });
  };

  const loadModels = async () => {
    let res = await API.get(`/api/user/models`);
    const { success, message, data } = res.data;
    if (success) {
      let localModelOptions = data.map((model) => ({
        label: model,
        value: model,
      }));
      setModels(localModelOptions);
    } else {
      showError(message);
    }
  };

  const loadGroups = async () => {
    let res = await API.get(`/api/user/self/groups`);
    const { success, message, data } = res.data;
    if (success) {
      // return data is a map, key is group name, value is group description
      // label is group description, value is group name
        let localGroupOptions = Object.keys(data).map((group) => ({
            label: data[group],
            value: group,
        }));
        setGroups(localGroupOptions);
    } else {
      showError(message);
    }
  };

  const loadToken = async () => {
    setLoading(true);
    let res = await API.get(`/api/token/${props.editingToken.id}`);
    const { success, message, data } = res.data;
    if (success) {
      if (data.expired_time !== -1) {
        data.expired_time = timestamp2string(data.expired_time);
      }
      if (data.model_limits !== '') {
        data.model_limits = data.model_limits.split(',');
      } else {
        data.model_limits = [];
      }
      setInputs(data);
    } else {
      showError(message);
    }
    setLoading(false);
  };
  useEffect(() => {
    setIsEdit(props.editingToken.id !== undefined);
  }, [props.editingToken.id]);

  useEffect(() => {
    if (!isEdit) {
      setInputs(originInputs);
    } else {
      loadToken().then(() => {
        // console.log(inputs);
      });
    }
    loadModels();
    loadGroups();
  }, [isEdit]);

  // 新增 state 变量 tokenCount 来记录User想要创建的TokenQuantity，Default for  1
  const [tokenCount, setTokenCount] = useState(1);

  // 新增处理 tokenCount 变化的函数
  const handleTokenCountChange = (value) => {
    // 确保UserEnter的是正整数
    const count = parseInt(value, 10);
    if (!isNaN(count) && count > 0) {
      setTokenCount(count);
    }
  };

  // 生成一  随机的四位Source Code数字字符串
  const generateRandomSuffix = () => {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  };

  const submit = async () => {
    setLoading(true);
    if (isEdit) {
      // EditToken的逻辑保持不变
      let localInputs = { ...inputs };
      localInputs.remain_quota = parseInt(localInputs.remain_quota);
      if (localInputs.expired_time !== -1) {
        let time = Date.parse(localInputs.expired_time);
        if (isNaN(time)) {
          showError('Expiration time format error!');
          setLoading(false);
          return;
        }
        localInputs.expired_time = Math.ceil(time / 1000);
      }
      localInputs.model_limits = localInputs.model_limits.join(',');
      let res = await API.put(`/api/token/`, {
        ...localInputs,
        id: parseInt(props.editingToken.id),
      });
      const { success, message } = res.data;
      if (success) {
        showSuccess('Token updated successfully！');
        props.refresh();
        props.handleClose();
      } else {
        showError(message);
      }
    } else {
      // 处理新增多  Token的情况
      let successCount = 0; // 记录Success创建的TokenQuantity
      for (let i = 0; i < tokenCount; i++) {
        let localInputs = { ...inputs };
        if (i !== 0) {
          // 如果User想要创建多  Token，则给每  Token一  序号后缀
          localInputs.name = `${inputs.name}-${generateRandomSuffix()}`;
        }
        localInputs.remain_quota = parseInt(localInputs.remain_quota);

        if (localInputs.expired_time !== -1) {
          let time = Date.parse(localInputs.expired_time);
          if (isNaN(time)) {
            showError('Expiration time format error!');
            setLoading(false);
            break;
          }
          localInputs.expired_time = Math.ceil(time / 1000);
        }
        localInputs.model_limits = localInputs.model_limits.join(',');
        let res = await API.post(`/api/token/`, localInputs);
        const { success, message } = res.data;

        if (success) {
          successCount++;
        } else {
          showError(message);
          break; // 如果创建Failure，终止循环
        }
      }

      if (successCount > 0) {
        showSuccess(
          `${successCount}  Token created successfully, please click copy on the list page to get the token!`,
        );
        props.refresh();
        props.handleClose();
      }
    }
    setLoading(false);
    setInputs(originInputs); // 重置表单
    setTokenCount(1); // 重置Quantity for Default值
  };

  return (
    <>
      <SideSheet
        placement={isEdit ? 'right' : 'left'}
        title={
          <Title level={3}>{isEdit ? 'Update Token Information' : 'Create New Token'}</Title>
        }
        headerStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
        bodyStyle={{ borderBottom: '1px solid var(--semi-color-border)' }}
        visible={props.visiable}
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
          <Input
            style={{ marginTop: 20 }}
            label='Name'
            name='name'
            placeholder={'Please enter a name'}
            onChange={(value) => handleInputChange('name', value)}
            value={name}
            autoComplete='new-password'
            required={!isEdit}
          />
          <Divider />
          <DatePicker
            label='Expiration time'
            name='expired_time'
            placeholder={'Please select an expiration time'}
            onChange={(value) => handleInputChange('expired_time', value)}
            value={expired_time}
            autoComplete='new-password'
            type='dateTime'
          />
          <div style={{ marginTop: 20 }}>
            <Space>
              <Button
                type={'tertiary'}
                onClick={() => {
                  setExpiredTime(0, 0, 0, 0);
                }}
              >
                Never expires
              </Button>
              <Button
                type={'tertiary'}
                onClick={() => {
                  setExpiredTime(0, 0, 1, 0);
                }}
              >
                One Hour
              </Button>
              <Button
                type={'tertiary'}
                onClick={() => {
                  setExpiredTime(1, 0, 0, 0);
                }}
              >
                One Month
              </Button>
              <Button
                type={'tertiary'}
                onClick={() => {
                  setExpiredTime(0, 1, 0, 0);
                }}
              >
                One Day
              </Button>
            </Space>
          </div>

          <Divider />
          <Banner
            type={'warning'}
            description={
              'Note that the quota of the token is only used to limit the maximum quota usage of the token itself, and the actual usage is limited by the remaining quota of the account.'
            }
          ></Banner>
          <div style={{ marginTop: 20 }}>
            <Typography.Text>{`Quota${renderQuotaWithPrompt(remain_quota)}`}</Typography.Text>
          </div>
          <AutoComplete
            style={{ marginTop: 8 }}
            name='remain_quota'
            placeholder={'Please enter the quota'}
            onChange={(value) => handleInputChange('remain_quota', value)}
            value={remain_quota}
            autoComplete='new-password'
            type='number'
            // position={'top'}
            data={[
              { value: 500000, label: '1$' },
              { value: 5000000, label: '10$' },
              { value: 25000000, label: '50$' },
              { value: 50000000, label: '100$' },
              { value: 250000000, label: '500$' },
              { value: 500000000, label: '1000$' },
            ]}
            disabled={unlimited_quota}
          />

          {!isEdit && (
            <>
              <div style={{ marginTop: 20 }}>
                <Typography.Text> New quantity </Typography.Text>
              </div>
              <AutoComplete
                style={{ marginTop: 8 }}
                label='Quantity'
                placeholder={'请 Select 或Enter创建Token的Quantity'}
                onChange={(value) => handleTokenCountChange(value)}
                onSelect={(value) => handleTokenCountChange(value)}
                value={tokenCount.toString()}
                autoComplete='off'
                type='number'
                data={[
                  { value: 10, label: '10' },
                  { value: 20, label: '20' },
                  { value: 30, label: '30' },
                  { value: 100, label: '100' },
                ]}
                disabled={unlimited_quota}
              />
            </>
          )}

          <div>
            <Button
              style={{ marginTop: 8 }}
              type={'warning'}
              onClick={() => {
                setUnlimitedQuota();
              }}
            >
              {unlimited_quota ? 'Cancel unlimited quota' : 'Set to unlimited quota'}
            </Button>
          </div>
          <Divider />
          <div style={{ marginTop: 10 }}>
            <Typography.Text> IP whitelist (don’t trust this feature too much) </Typography.Text>
          </div>
          <TextArea
            label='IP白名单'
            name='allow_ips'
            placeholder={' Allowed IPs, one per line '}
            onChange={(value) => {
              handleInputChange('allow_ips', value);
            }}
            value={inputs.allow_ips}
            style={{ fontFamily: 'JetBrains Mono, Consolas' }}
          />
          <div style={{ marginTop: 10, display: 'flex' }}>
            <Space>
              <Checkbox
                name='model_limits_enabled'
                checked={model_limits_enabled}
                onChange={(e) =>
                  handleInputChange('model_limits_enabled', e.target.checked)
                }
              ></Checkbox>
              <Typography.Text>
                 Enable model restrictions (not necessary, not recommended) 
              </Typography.Text>
            </Space>
          </div>

          <Select
            style={{ marginTop: 8 }}
            placeholder={'请 Select 该Channel所 support 的Model'}
            name='models'
            required
            multiple
            selection
            onChange={(value) => {
              handleInputChange('model_limits', value);
            }}
            value={inputs.model_limits}
            autoComplete='new-password'
            optionList={models}
            disabled={!model_limits_enabled}
          />
          <div style={{ marginTop: 10 }}>
            <Typography.Text>Token Group, default to user group</Typography.Text>
          </div>
          {groups.length > 0 ?
            <Select
              style={{ marginTop: 8 }}
              placeholder={'Token Group, default to user group'}
              name='gruop'
              required
              selection
              onChange={(value) => {
                handleInputChange('group', value);
              }}
              value={inputs.group}
              autoComplete='new-password'
              optionList={groups}
            />:
            <Select
              style={{ marginTop: 8 }}
              placeholder={'Admin未SettingsUser Usable Groups'}
              name='gruop'
              disabled={true}
            />
          }
        </Spin>
      </SideSheet>
    </>
  );
};

export default EditToken;
