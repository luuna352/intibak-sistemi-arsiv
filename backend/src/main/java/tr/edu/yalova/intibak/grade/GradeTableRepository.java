package tr.edu.yalova.intibak.grade;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

/** grade_table tablosuna erişim. */
public interface GradeTableRepository extends JpaRepository<GradeTable, Long> {

    List<GradeTable> findAllByOrderByIdAsc();
}
