import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API, getLogo, showError, showInfo, showSuccess } from '../helpers';
import Turnstile from 'react-turnstile';
import { Button, Card, Form, Layout } from '@douyinfe/semi-ui';
import Title from '@douyinfe/semi-ui/lib/es/typography/title';
import Text from '@douyinfe/semi-ui/lib/es/typography/text';

const RegisterForm = () => {
  const [inputs, setInputs] = useState({
    username: '',
    password: '',
    password2: '',
    email: '',
    verification_code: ''
  });
  const { username, password, password2 } = inputs;
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [turnstileEnabled, setTurnstileEnabled] = useState(false);
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [loading, setLoading] = useState(false);
  const logo = getLogo();
  let affCode = new URLSearchParams(window.location.search).get('aff');
  if (affCode) {
    localStorage.setItem('aff', affCode);
  }

  useEffect(() => {
    let status = localStorage.getItem('status');
    if (status) {
      status = JSON.parse(status);
      setShowEmailVerification(status.email_verification);
      if (status.turnstile_check) {
        setTurnstileEnabled(true);
        setTurnstileSiteKey(status.turnstile_site_key);
      }
    }
  });

  let navigate = useNavigate();

  function handleChange(name, value) {
    setInputs((inputs) => ({ ...inputs, [name]: value }));
  }

  async function handleSubmit(e) {
    if (password.length < 8) {
      showInfo('Password length must be at least 8 characters!');
      return;
    }
    if (password !== password2) {
      showInfo('The two passwords entered do not match');
      return;
    }
    if (username && password) {
      if (turnstileEnabled && turnstileToken === '') {
        showInfo('Please wait a few seconds to retry, Turnstile is checking the user environment!');
        return;
      }
      setLoading(true);
      if (!affCode) {
        affCode = localStorage.getItem('aff');
      }
      inputs.aff_code = affCode;
      const res = await API.post(
        `/api/user/register?turnstile=${turnstileToken}`,
        inputs
      );
      const { success, message } = res.data;
      if (success) {
        navigate('/login');
        showSuccess('Registration Successful!');
      } else {
        showError(message);
      }
      setLoading(false);
    }
  }

  const sendVerificationCode = async () => {
    if (inputs.email === '') return;
    if (turnstileEnabled && turnstileToken === '') {
      showInfo('Please wait a few seconds to retry, Turnstile is checking the user environment!');
      return;
    }
    setLoading(true);
    const res = await API.get(
      `/api/verification?email=${inputs.email}&turnstile=${turnstileToken}`
    );
    const { success, message } = res.data;
    if (success) {
      showSuccess('Verification code sent successfully, please check your inbox!');
    } else {
      showError(message);
    }
    setLoading(false);
  };

  return (
    <div>
      <Layout>
        <Layout.Header></Layout.Header>
        <Layout.Content>
          <div
            style={{
              justifyContent: 'center',
              display: 'flex',
              marginTop: 120
            }}
          >
            <div style={{ width: 500 }}>
              <Card>
                <Title heading={2} style={{ textAlign: 'center' }}>
                  New User Registration
                </Title>
                <Form size="large">
                  <Form.Input
                    field={'username'}
                    label={'username'}
                    placeholder="Username"
                    name="username"
                    onChange={(value) => handleChange('username', value)}
                  />
                  <Form.Input
                    field={'password'}
                    label={'Password'}
                    placeholder="Password，最短 8 位，最长 20 位"
                    name="password"
                    type="password"
                    onChange={(value) => handleChange('password', value)}
                  />
                  <Form.Input
                    field={'password2'}
                    label={'Confirm Password'}
                    placeholder="Confirm Password"
                    name="password2"
                    type="password"
                    onChange={(value) => handleChange('password2', value)}
                  />
                  {showEmailVerification ? (
                    <>
                      <Form.Input
                        field={'email'}
                        label={'Email'}
                        placeholder="Enter Email Address"
                        onChange={(value) => handleChange('email', value)}
                        name="email"
                        type="email"
                        suffix={
                          <Button onClick={sendVerificationCode} disabled={loading}>
                            Get Verification Code
                          </Button>
                        }
                      />
                      <Form.Input
                        field={'verification_code'}
                        label={'Verification Code'}
                        placeholder="Enter Verification Code"
                        onChange={(value) => handleChange('verification_code', value)}
                        name="verification_code"
                      />
                    </>
                  ) : (
                    <></>
                  )}
                  <Button
                    theme='solid'
                    style={{ width: '100%' }}
                    type={'primary'}
                    size='large'
                    htmlType={'submit'}
                    onClick={handleSubmit}
                  >
                    Register
                  </Button>
                </Form>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 20
                  }}
                >
                  <Text>
                    Already have an account?
                    <Link to="/login">
                      Click to log in
                    </Link>
                  </Text>
                </div>
              </Card>
              {turnstileEnabled ? (
                <Turnstile
                  sitekey={turnstileSiteKey}
                  onVerify={(token) => {
                    setTurnstileToken(token);
                  }}
                />
              ) : (
                <></>
              )}
            </div>
          </div>
        </Layout.Content>
      </Layout>
    </div>
  );
};

export default RegisterForm;
