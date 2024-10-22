import React, { useEffect, useState, useRef } from 'react';
import { Button, Col, Form, Row, Spin, DatePicker } from '@douyinfe/semi-ui';
import dayjs from 'dayjs';
import {
  compareObjects,
  API,
  showError,
  showSuccess,
  showWarning,
} from '../../../helpers';

export default function SettingsLog(props) {
  const [loading, setLoading] = useState(false);
  const [loadingCleanHistoryLog, setLoadingCleanHistoryLog] = useState(false);
  const [inputs, setInputs] = useState({
    LogConsumeEnabled: false,
    historyTimestamp: dayjs().subtract(1, 'month').toDate(),
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow).filter(
      (item) => item.key !== 'historyTimestamp',
    );

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
        value,
      });
    });
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (requestQueue.length === 1) {
          if (res.includes(undefined)) return;
        } else if (requestQueue.length > 1) {
          if (res.includes(undefined)) return showError('部分Save failed, please try again');
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
  }
  async function onCleanHistoryLog() {
    try {
      setLoadingCleanHistoryLog(true);
      if (!inputs.historyTimestamp) throw new Error('Please select a log record time');
      const res = await API.delete(
        `/api/log/?target_timestamp=${Date.parse(inputs.historyTimestamp) / 1000}`,
      );
      const { success, message, data } = res.data;
      if (success) {
        showSuccess(`${data} logs have been cleared!`);
        return;
      } else {
        throw new Error('Log clearing failed:' + message);
      }
    } catch (error) {
      showError(error.message);
    } finally {
      setLoadingCleanHistoryLog(false);
    }
  }

  useEffect(() => {
    const currentInputs = {};
    for (let key in props.options) {
      if (Object.keys(inputs).includes(key)) {
        currentInputs[key] = props.options[key];
      }
    }
    currentInputs['historyTimestamp'] = inputs.historyTimestamp;
    setInputs(Object.assign(inputs, currentInputs));
    setInputsRow(structuredClone(currentInputs));
    refForm.current.setValues(currentInputs);
  }, [props.options]);
  return (
    <>
      <Spin spinning={loading}>
        <Form
          values={inputs}
          getFormApi={(formAPI) => (refForm.current = formAPI)}
          style={{ marginBottom: 15 }}
        >
          <Form.Section text={'Log Settings'}>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Switch
                  field={'LogConsumeEnabled'}
                  label={'Enable quota consumption log recording'}
                  size='large'
                  checkedText='｜'
                  uncheckedText='〇'
                  onChange={(value) => {
                    setInputs({
                      ...inputs,
                      LogConsumeEnabled: value,
                    });
                  }}
                />
              </Col>
              <Col span={8}>
                <Spin spinning={loadingCleanHistoryLog}>
                  <Form.DatePicker
                    label='Log Record Time'
                    field={'historyTimestamp'}
                    type='dateTime'
                    inputReadOnly={true}
                    onChange={(value) => {
                      setInputs({
                        ...inputs,
                        historyTimestamp: value,
                      });
                    }}
                  />
                  <Button size='default' onClick={onCleanHistoryLog}>
                    Clear History Log
                  </Button>
                </Spin>
              </Col>
            </Row>

            <Row>
              <Button size='large' onClick={onSubmit}>
                Save Log Settings
              </Button>
            </Row>
          </Form.Section>
        </Form>
      </Spin>
    </>
  );
}
