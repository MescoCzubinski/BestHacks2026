from app.main import MAX_FAILURE_RETRY_S, failure_delay


def test_retry_delay_doubles_and_is_capped():
    assert failure_delay(1) == 900
    assert failure_delay(2) == 1800
    assert failure_delay(3) == 3600
    assert failure_delay(50) == MAX_FAILURE_RETRY_S
