package tr.edu.yalova.intibak.system;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import tr.edu.yalova.intibak.security.SecurityConfig;

/**
 * @WebMvcTest sadece web katmanını (HealthController) açar; gerçek veritabanı gerekmez.
 * JdbcTemplate yerine sahte (mock) bir nesne konur ve ne döneceği testte belirlenir.
 */
@WebMvcTest(HealthController.class)
// Gerçek güvenlik kuralları yüklenir: /api/health giriş olmadan açık olmalı.
@Import(SecurityConfig.class)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JdbcTemplate jdbcTemplate;

    @Test
    void returnsUpWithDatabaseVersion() throws Exception {
        when(jdbcTemplate.queryForObject(anyString(), eq(String.class))).thenReturn("17.6");

        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.database").value("PostgreSQL 17.6"));
    }
}
