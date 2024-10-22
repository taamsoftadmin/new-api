import React, { useEffect, useState, useRef } from 'react';
import { Button, Col, Form, Popconfirm, Row, Space, Spin } from '@douyinfe/semi-ui';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
  verifyJSON,
  verifyJSONPromise
} from '../../../helpers';

export default function SettingsMagnification(props) {
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    ModelPrice: '',
    ModelRatio: '',
    CompletionRatio: '',
    GroupRatio: '',
    UserUsableGroups: ''
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  async function onSubmit() {
    try {
      console.log('Starting validation...');
      await refForm.current.validate().then(() => {
        console.log('Validation passed');
        const updateArray = compareObjects(inputs, inputsRow);
        if (!updateArray.length) return showWarning('It seems you havent modified anything');
        const requestQueue = updateArray.map((item) => {
          let value = '';
          if (typeof inputs[item.key] === 'boolean') {
            value = String(inputs[item.key]);
          } else {
            value = inputs[item.key];
          }
          return API.put('/api/option/', {
            key: item.key,
            value
          });
        });
        setLoading(true);
        Promise.all(requestQueue)
          .then((res) => {
            if (requestQueue.length === 1) {
              if (res.includes(undefined)) return;
            } else if (requestQueue.length > 1) {
              if (res.includes(undefined))
                return showError('部分Save failed, please try again');
            }
            showSuccess('Save Successful');
            props.refresh();
          })
          .catch(() => {
            showError('Save failed, please try again');
          })
          .finally(() => {
            setLoading(false);
          });
      }).catch((error) => {
        console.error('Validation failed:', error);
        showError('Please check the input');
      });
    } catch (error) {
      showError('Please check the input');
      console.error(error);
    }
  }

  async function resetModelRatio() {
    try {
      let res = await API.post(`/api/option/rest_model_ratio`);
      // return {success, message}
      if (res.data.success) {
        showSuccess(res.data.message);
        props.refresh();
      } else {
        showError(res.data.message);
      }
    } catch (error) {
      showError(error);
    }
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    setInputs(currentInputs);
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);

  return (
    <Spin spinning={loading}>
      <Form
        values={inputs}
        getFormApi={(formAPI) => (refForm.current = formAPI)}
        style={{ marginBottom: 15 }}
      >
        <Form.Section text={'Rate Settings'}>
          <Row gutter={16}>
            <Col span={16}>
              <Form.TextArea
                label={'Fixed Price for Model'}
                extraText={'Cost per call in tokens, higher priority than model ratio'}
                placeholder={
                  'Enter a JSON object where the key is the model name and the value is the cost per call in tokens, e.g., "gpt-4-gizmo-*": 0.1 for a cost of 0.1 tokens per call'
                }
                field={'ModelPrice'}
                autosize={{ minRows: 6, maxRows: 12 }}
                trigger='blur'
                stopValidateWithError
                rules={[
                  {
                    validator: (rule, value) => {
                      return verifyJSON(value);
                    },
                    message: 'Not a valid JSON string'
                  }
                ]}
                onChange={(value) =>
                  setInputs({
                    ...inputs,
                    ModelPrice: value
                  })
                }
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.TextArea
                label={'Model rate'}
                extraText={''}
                placeholder={'Is a JSON text，Key is model name，Value is the rate'}
                field={'ModelRatio'}
                autosize={{ minRows: 6, maxRows: 12 }}
                trigger='blur'
                stopValidateWithError
                rules={[
                  {
                    validator: (rule, value) => {
                      return verifyJSON(value);
                    },
                    message: 'Not a valid JSON string'
                  }
                ]}
                onChange={(value) =>
                  setInputs({
                    ...inputs,
                    ModelRatio: value
                  })
                }
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.TextArea
                label={'Completion Ratio for Models (only effective for custom models)'}
                extraText={'仅对CustomModel有效'}
                placeholder={'Is a JSON text，Key is model name，Value is the rate'}
                field={'CompletionRatio'}
                autosize={{ minRows: 6, maxRows: 12 }}
                trigger='blur'
                stopValidateWithError
                rules={[
                  {
                    validator: (rule, value) => {
                      return verifyJSON(value);
                    },
                    message: 'Not a valid JSON string'
                  }
                ]}
                onChange={(value) =>
                  setInputs({
                    ...inputs,
                    CompletionRatio: value
                  })
                }
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.TextArea
                label={'Group rate'}
                extraText={''}
                placeholder={'Is a JSON text，Key is group name，Value is the rate'}
                field={'GroupRatio'}
                autosize={{ minRows: 6, maxRows: 12 }}
                trigger='blur'
                stopValidateWithError
                rules={[
                  {
                    validator: (rule, value) => {
                      return verifyJSON(value);
                    },
                    message: 'Not a valid JSON string'
                  }
                ]}
                onChange={(value) =>
                  setInputs({
                    ...inputs,
                    GroupRatio: value
                  })
                }
              />
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={16}>
              <Form.TextArea
                  label={'User Usable Groups'}
                  extraText={''}
                  placeholder={'Is a JSON text，Key is group name，Value is the rate'}
                  field={'UserUsableGroups'}
                  autosize={{ minRows: 6, maxRows: 12 }}
                  trigger='blur'
                  stopValidateWithError
                  rules={[
                    {
                      validator: (rule, value) => {
                        return verifyJSON(value);
                      },
                      message: 'Not a valid JSON string'
                    }
                  ]}
                  onChange={(value) =>
                      setInputs({
                        ...inputs,
                        UserUsableGroups: value
                      })
                  }
              />
            </Col>
          </Row>
        </Form.Section>
      </Form>
      <Space>
        <Button onClick={onSubmit}>
          Save Rate Settings
        </Button>
        <Popconfirm
          title='Are you sure you want to reset the model ratio?'
          content='This modification cannot be undone.'
          okType={'danger'}
          position={'top'}
          onConfirm={() => {
            resetModelRatio();
          }}
        >
          <Button type={'danger'}>
            重置Model rate
          </Button>
        </Popconfirm>
      </Space>
    </Spin>
  );
}
