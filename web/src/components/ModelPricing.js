import React, { useContext, useEffect, useRef, useMemo, useState } from 'react';
import { API, copy, showError, showInfo, showSuccess } from '../helpers';

import {
  Banner,
  Input,
  Layout,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
  Popover,
  ImagePreview,
  Button,
} from '@douyinfe/semi-ui';
import {
  IconMore,
  IconVerify,
  IconUploadError,
  IconHelpCircle,
} from '@douyinfe/semi-icons';
import { UserContext } from '../context/User/index.js';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';

function renderQuotaType(type) {
  // Ensure all cases are string literals by adding quotes.
  switch (type) {
    case 1:
      return (
        <Tag color='teal' size='large'>
          Per Use Billing
        </Tag>
      );
    case 0:
      return (
        <Tag color='violet' size='large'>
          Quantity Billing
        </Tag>
      );
    default:
      return 'Unknown';
  }
}

function renderAvailable(available) {
  return available ? (
    <Popover
        content={
          <div style={{ padding: 8 }}>Your group can use this model</div>
        }
        position='top'
        key={available}
        style={{
            backgroundColor: 'rgba(var(--semi-blue-4),1)',
            borderColor: 'rgba(var(--semi-blue-4),1)',
            color: 'var(--semi-color-white)',
            borderWidth: 1,
            borderStyle: 'solid',
        }}
    >
        <IconVerify style={{ color: 'green' }}  size="large" />
    </Popover>
  ) : (
    <Popover
        content={
          <div style={{ padding: 8 }}>Your group does not have permission to use this model</div>
        }
        position='top'
        key={available}
        style={{
            backgroundColor: 'rgba(var(--semi-blue-4),1)',
            borderColor: 'rgba(var(--semi-blue-4),1)',
            color: 'var(--semi-color-white)',
            borderWidth: 1,
            borderStyle: 'solid',
        }}
    >
        <IconUploadError style={{ color: '#FFA54F' }}  size="large" />
    </Popover>
  );
}

const ModelPricing = () => {
  const [filteredValue, setFilteredValue] = useState([]);
  const compositionRef = useRef({ isComposition: false });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [modalImageUrl, setModalImageUrl] = useState('');
  const [isModalOpenurl, setIsModalOpenurl] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState('default');

  const rowSelection = useMemo(
      () => ({
          onChange: (selectedRowKeys, selectedRows) => {
            setSelectedRowKeys(selectedRowKeys);
          },
      }),
      []
  );

  const handleChange = (value) => {
    if (compositionRef.current.isComposition) {
      return;
    }
    const newFilteredValue = value ? [value] : [];
    setFilteredValue(newFilteredValue);
  };
  const handleCompositionStart = () => {
    compositionRef.current.isComposition = true;
  };

  const handleCompositionEnd = (event) => {
    compositionRef.current.isComposition = false;
    const value = event.target.value;
    const newFilteredValue = value ? [value] : [];
    setFilteredValue(newFilteredValue);
  };

  const columns = [
    {
      title: ' available',
      dataIndex: 'available',
      render: (text, record, index) => {
         // if record.enable_groups contains selectedGroup, then available is true
        return renderAvailable(record.enable_groups.includes(selectedGroup));
      },
      sorter: (a, b) => a.available - b.available,
    },
    {
      title: (
        <Space>
          <span>Model Name</span>
          <Input
            placeholder=' search '
            style={{ width: 200 }}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onChange={handleChange}
            showClear
          />
        </Space>
      ),
      dataIndex: 'model_name', // 以finish_time作 for dataIndex
      render: (text, record, index) => {
        return (
          <>
            <Tag
              color='green'
              size='large'
              onClick={() => {
                copyText(text);
              }}
            >
              {text}
            </Tag>
          </>
        );
      },
      onFilter: (value, record) =>
        record.model_name.toLowerCase().includes(value.toLowerCase()),
      filteredValue,
    },
    {
      title: 'billingType',
      dataIndex: 'quota_type',
      render: (text, record, index) => {
        return renderQuotaType(parseInt(text));
      },
      sorter: (a, b) => a.quota_type - b.quota_type,
    },
    {
      title: ' available Group',
      dataIndex: 'enable_groups',
      render: (text, record, index) => {
        // enable_groups is a string array
        return (
          <Space>
            {text.map((group) => {
              if (group === selectedGroup) {
                return (
                  <Tag
                    color='blue'
                    size='large'
                    prefixIcon={<IconVerify />}
                  >
                    {group}
                  </Tag>
                );
              } else {
                return (
                  <Tag
                    color='blue'
                    size='large'
                    onClick={() => {
                      setSelectedGroup(group);
                      showInfo('Group for current View ：' + group + '， magnification  for ：' + groupRatio[group]);
                    }}
                  >
                    {group}
                  </Tag>
                );
              }
            })}
          </Space>
        );
      },
    },
    {
      title: () => (
        <span style={{'display':'flex','alignItems':'center'}}>
           magnification 
          <Popover
            content={
              <div style={{ padding: 8 }}> magnification is for Different for convenience of conversion price for Model<br/>click to view magnification illustrate</div>
            }
            position='top'
            style={{
                backgroundColor: 'rgba(var(--semi-blue-4),1)',
                borderColor: 'rgba(var(--semi-blue-4),1)',
                color: 'var(--semi-color-white)',
                borderWidth: 1,
                borderStyle: 'solid',
            }}
          >
            <IconHelpCircle
              onClick={() => {
                setModalImageUrl('/ratio.png');
                setIsModalOpenurl(true);
              }}
            />
          </Popover>
        </span>
      ),
      dataIndex: 'model_ratio',
      render: (text, record, index) => {
        let content = text;
        let completionRatio = parseFloat(record.completion_ratio.toFixed(3));
        content = (
          <>
            <Text>Model：{record.quota_type === 0 ? text : 'None'}</Text>
            <br />
            <Text>Completion：{record.quota_type === 0 ? completionRatio : 'None'}</Text>
            <br />
            <Text>Group：{groupRatio[selectedGroup]}</Text>
          </>
        );
        return <div>{content}</div>;
      },
    },
    {
      title: 'Model price ',
      dataIndex: 'model_price',
      render: (text, record, index) => {
        let content = text;
        if (record.quota_type === 0) {
          // 这里的 *2 是因 for  1 magnification =0.002刀，请勿Delete
          let inputRatioPrice = record.model_ratio * 2 * groupRatio[selectedGroup];
          let completionRatioPrice =
            record.model_ratio *
            record.completion_ratio * 2 *
            groupRatio[selectedGroup];
          content = (
            <>
              <Text>Prompt ${inputRatioPrice} / 1M tokens</Text>
              <br />
              <Text>Completion ${completionRatioPrice} / 1M tokens</Text>
            </>
          );
        } else {
          let price = parseFloat(text) * groupRatio[selectedGroup];
          content = <>Model price ：${price}</>;
        }
        return <div>{content}</div>;
      },
    },
  ];

  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userState, userDispatch] = useContext(UserContext);
  const [groupRatio, setGroupRatio] = useState({});

  const setModelsFormat = (models, groupRatio) => {
    for (let i = 0; i < models.length; i++) {
      models[i].key = models[i].model_name;
      models[i].group_ratio = groupRatio[models[i].model_name];
    }
    // sort by quota_type
    models.sort((a, b) => {
      return a.quota_type - b.quota_type;
    });

    // sort by model_name, start with gpt is max, other use localeCompare
    models.sort((a, b) => {
      if (a.model_name.startsWith('gpt') && !b.model_name.startsWith('gpt')) {
        return -1;
      } else if (
        !a.model_name.startsWith('gpt') &&
        b.model_name.startsWith('gpt')
      ) {
        return 1;
      } else {
        return a.model_name.localeCompare(b.model_name);
      }
    });

    setModels(models);
  };

  const loadPricing = async () => {
    setLoading(true);

    let url = '';
    url = `/api/pricing`;
    const res = await API.get(url);
    const { success, message, data, group_ratio } = res.data;
    if (success) {
      setGroupRatio(group_ratio);
      setSelectedGroup(userState.user ? userState.user.group : 'default')
      setModelsFormat(data, group_ratio);
    } else {
      showError(message);
    }
    setLoading(false);
  };

  const refresh = async () => {
    await loadPricing();
  };

  const copyText = async (text) => {
    if (await copy(text)) {
      showSuccess('Copied: ' + text);
    } else {
      // setSearchKeyword(text);
      Modal.error({ title: 'Unable to copy to clipboard, please copy manually.', content: text });
    }
  };

  useEffect(() => {
    refresh().then();
  }, []);

  return (
    <>
      <Layout>
        {userState.user ? (
          <Banner
            type="success"
            fullMode={false}
            closeIcon="null"
            description={`Your DefaultGroup for ：${userState.user.group}，Group rate for ：${groupRatio[userState.user.group]}`}
          />
        ) : (
          <Banner
            type='warning'
            fullMode={false}
            closeIcon="null"
            description={`You are not logged in, the displayed price is based on the default group ratio: ${groupRatio['default']}`}
          />
        )}
        <br/>
        <Banner 
            type="info"
            fullMode={false}
            description={<div>Per-use billing fee = Group Ratio × Model Ratio × (Prompt Tokens + Completion Tokens × Completion Ratio) / 500,000 (unit: USD)</div>}
            closeIcon="null"
        />
        <br/>
        <Button
          theme='light'
          type='tertiary'
          style={{width: 150}}
          onClick={() => {
            copyText(selectedRowKeys);
          }}
          disabled={selectedRowKeys == ""}
        >
          Copy选中Model
        </Button>
        <Table
          style={{ marginTop: 5 }}
          columns={columns}
          dataSource={models}
          loading={loading}
          pagination={{
            pageSize: models.length,
            showSizeChanger: false,
          }}
          rowSelection={rowSelection}
        />
        <ImagePreview
          src={modalImageUrl}
          visible={isModalOpenurl}
          onVisibleChange={(visible) => setIsModalOpenurl(visible)}
        />
      </Layout>
    </>
  );
};

export default ModelPricing;